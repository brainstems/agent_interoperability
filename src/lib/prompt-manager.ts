import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

export interface PromptVariable {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'object'
  required: boolean
  default?: any
}

export interface PromptTemplate {
  id: string
  churchId: string
  agentType: string
  promptType: string
  name: string
  description?: string
  systemPrompt: string
  userPrompt?: string
  variables?: PromptVariable[]
  temperature: number
  maxTokens: number
  model: string
  isActive: boolean
  version: number
}

export interface PromptExecutionResult {
  response: string
  tokensUsed?: number
  cost?: number
  duration: number
  success: boolean
  errorMessage?: string
}

export class PromptManager {
  private openai: OpenAI | null = null
  private cache: Map<string, PromptTemplate> = new Map()

  constructor() {
    // Initialize OpenAI lazily to avoid build-time errors
  }

  private getOpenAI(): OpenAI {
    if (!this.openai && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    if (!this.openai) {
      throw new Error('OpenAI API key not configured')
    }
    return this.openai
  }

  // Initialize default prompts for all agents
  async initializeDefaultPrompts(churchId: string): Promise<void> {
    const defaultPrompts = this.getDefaultPrompts(churchId)
    
    for (const prompt of defaultPrompts) {
      await this.createOrUpdatePrompt(prompt)
    }
  }

  // Get prompt by type and name
  async getPrompt(
    churchId: string, 
    agentType: string, 
    promptType: string, 
    name: string
  ): Promise<PromptTemplate | null> {
    const cacheKey = `${churchId}-${agentType}-${promptType}-${name}`
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const { data: prompt, error } = await supabase
      .from('agent_prompts')
      .select('*')
      .eq('church_id', churchId)
      .eq('agent_type', agentType)
      .eq('prompt_type', promptType)
      .eq('name', name)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching prompt:', error)
      return null
    }

    if (prompt) {
      const template: PromptTemplate = {
        id: prompt.id,
        churchId: prompt.church_id,
        agentType: prompt.agent_type,
        promptType: prompt.prompt_type,
        name: prompt.name,
        description: prompt.description || undefined,
        systemPrompt: prompt.system_prompt,
        userPrompt: prompt.user_prompt || undefined,
        variables: prompt.variables as PromptVariable[] || undefined,
        temperature: prompt.temperature,
        maxTokens: prompt.max_tokens,
        model: prompt.model,
        isActive: prompt.is_active,
        version: prompt.version
      }
      
      this.cache.set(cacheKey, template)
      return template
    }

    return null
  }

  // Execute prompt with variables
  async executePrompt(
    churchId: string,
    agentType: string,
    promptType: string,
    name: string,
    variables: Record<string, any> = {},
    sessionId?: string
  ): Promise<PromptExecutionResult> {
    const startTime = Date.now()
    
    try {
      const template = await this.getPrompt(churchId, agentType, promptType, name)
      if (!template || !template.isActive) {
        throw new Error(`Prompt not found or inactive: ${agentType}/${promptType}/${name}`)
      }

      // Validate required variables
      if (template.variables) {
        for (const variable of template.variables) {
          if (variable.required && !(variable.name in variables)) {
            throw new Error(`Required variable missing: ${variable.name}`)
          }
        }
      }

      // Replace variables in prompts
      const systemPrompt = this.replaceVariables(template.systemPrompt, variables)
      const userPrompt = template.userPrompt ? this.replaceVariables(template.userPrompt, variables) : ''

      // Execute the prompt
      const openai = this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: template.model,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...(userPrompt ? [{ role: 'user' as const, content: userPrompt }] : [])
        ],
        temperature: template.temperature,
        max_tokens: template.maxTokens
      })

      const result: PromptExecutionResult = {
        response: response.choices[0]?.message?.content || '',
        tokensUsed: response.usage?.total_tokens,
        cost: this.calculateCost(template.model, response.usage?.total_tokens || 0),
        duration: Date.now() - startTime,
        success: true
      }

      // Log execution
      if (sessionId) {
        await this.logExecution(template.id, sessionId, variables, systemPrompt + '\n\n' + userPrompt, result)
      }

      return result
    } catch (error) {
      const result: PromptExecutionResult = {
        response: '',
        duration: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      }

      if (sessionId) {
        const template = await this.getPrompt(churchId, agentType, promptType, name)
        if (template) {
          await this.logExecution(template.id, sessionId, variables, '', result)
        }
      }

      throw error
    }
  }

  // Create or update prompt
  async createOrUpdatePrompt(prompt: Omit<PromptTemplate, 'id'>): Promise<PromptTemplate> {
    const existing = await this.getPrompt(
      prompt.churchId,
      prompt.agentType,
      prompt.promptType,
      prompt.name
    )

    const data = {
      church_id: prompt.churchId,
      agent_type: prompt.agentType,
      prompt_type: prompt.promptType,
      name: prompt.name,
      description: prompt.description,
      system_prompt: prompt.systemPrompt,
      user_prompt: prompt.userPrompt,
      variables: prompt.variables || null,
      temperature: prompt.temperature,
      max_tokens: prompt.maxTokens,
      model: prompt.model,
      is_active: prompt.isActive,
      version: existing ? existing.version + 1 : 1,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      const { data: result, error } = await supabase
        .from('agent_prompts')
        .update(data)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update prompt: ${error.message}`)
      }
      
      return {
        id: result.id,
        ...prompt,
        version: result.version
      }
    } else {
      const { data: result, error } = await supabase
        .from('agent_prompts')
        .insert({ ...data, created_at: new Date().toISOString() })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create prompt: ${error.message}`)
      }
      
      return {
        id: result.id,
        ...prompt,
        version: result.version
      }
    }

    // Clear cache
    const cacheKey = `${prompt.churchId}-${prompt.agentType}-${prompt.promptType}-${prompt.name}`
    this.cache.delete(cacheKey)
  }

  // Get all prompts for an agent
  async getAgentPrompts(churchId: string, agentType: string): Promise<PromptTemplate[]> {
    const { data: prompts, error } = await supabase
      .from('agent_prompts')
      .select('*')
      .eq('church_id', churchId)
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .order('prompt_type', { ascending: true })

    if (error) {
      throw new Error(`Failed to get agent prompts: ${error.message}`)
    }

    return (prompts || []).map(prompt => ({
      id: prompt.id,
      churchId: prompt.church_id,
      agentType: prompt.agent_type,
      promptType: prompt.prompt_type,
      name: prompt.name,
      description: prompt.description || undefined,
      systemPrompt: prompt.system_prompt,
      userPrompt: prompt.user_prompt || undefined,
      variables: prompt.variables as PromptVariable[] || undefined,
      temperature: prompt.temperature,
      maxTokens: prompt.max_tokens,
      model: prompt.model,
      isActive: prompt.is_active,
      version: prompt.version
    }))
  }

  // Get execution history
  async getExecutionHistory(
    promptId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('prompt_executions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get execution history: ${error.message}`)
    }

    return data || []
  }

  // Private helper methods
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, String(value))
    }
    
    return result
  }

  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - adjust based on actual OpenAI pricing
    const rates = {
      'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
      'gpt-4-turbo': 0.01 / 1000,
      'gpt-3.5-turbo': 0.002 / 1000
    }
    
    return (rates[model as keyof typeof rates] || rates['gpt-4']) * tokens
  }

  private async logExecution(
    promptId: string,
    sessionId: string,
    variables: Record<string, any>,
    prompt: string,
    result: PromptExecutionResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prompt_executions')
        .insert({
          prompt_id: promptId,
          session_id: sessionId,
          variables,
          prompt,
          response: result.response,
          tokens_used: result.tokensUsed,
          cost: result.cost,
          duration: result.duration,
          success: result.success,
          error_message: result.errorMessage,
          executed_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Failed to log prompt execution:', error)
      }
    } catch (error) {
      console.error('Failed to log prompt execution:', error)
    }
  }

  // Default prompts for each agent type
  private getDefaultPrompts(churchId: string): Omit<PromptTemplate, 'id'>[] {
    return [
      // Meeting Organizer Agent Prompts
      {
        churchId,
        agentType: 'MeetingOrganizer',
        promptType: 'SYSTEM',
        name: 'base_system',
        description: 'Base system prompt for Meeting Organizer Agent',
        systemPrompt: `You are a Meeting Organizer AI Agent for a church management system. Your role is to help coordinate meetings, schedule events, manage attendees, and ensure smooth meeting logistics.

Core Responsibilities:
- Schedule and organize meetings with appropriate attendees
- Generate meeting agendas based on topics and context
- Send meeting reminders and notifications
- Handle meeting conflicts and rescheduling
- Coordinate meeting logistics (location, resources, etc.)

Church Context:
- You work within a church environment with pastors, staff, volunteers, and members
- Maintain a warm, professional, and pastoral tone
- Respect church hierarchy and protocols
- Consider church calendar and ministry schedules
- Be sensitive to pastoral care and spiritual matters

Available Tools: {{available_tools}}

Current Context: {{context}}

Always provide helpful, actionable responses that move meetings forward efficiently while maintaining the caring nature of church community.`,
        temperature: 0.7,
        maxTokens: 1000,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'available_tools', description: 'List of available tools', type: 'string', required: true },
          { name: 'context', description: 'Current session context', type: 'string', required: false }
        ]
      },
      {
        churchId,
        agentType: 'MeetingOrganizer',
        promptType: 'MEETING_AGENDA',
        name: 'generate_agenda',
        description: 'Generate meeting agenda based on topics',
        systemPrompt: `Generate a professional meeting agenda for a church meeting.

Meeting Details:
- Title: {{meeting_title}}
- Duration: {{duration}} minutes
- Topics: {{topics}}
- Include Action Items: {{include_action_items}}

Format the agenda with:
1. Opening prayer/devotion (5 minutes)
2. Review of previous meeting minutes
3. Main discussion topics with time allocations
4. Action items and assignments (if requested)
5. Next steps and closing prayer

Keep the tone professional yet warm, appropriate for a church setting.`,
        userPrompt: 'Create a detailed agenda for this meeting that will help keep discussions focused and productive.',
        temperature: 0.5,
        maxTokens: 800,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'meeting_title', description: 'Title of the meeting', type: 'string', required: true },
          { name: 'duration', description: 'Meeting duration in minutes', type: 'number', required: true },
          { name: 'topics', description: 'List of topics to discuss', type: 'string', required: true },
          { name: 'include_action_items', description: 'Whether to include action items section', type: 'boolean', required: false, default: true }
        ]
      },

      // Email Processing Agent Prompts
      {
        churchId,
        agentType: 'EmailProcessor',
        promptType: 'SYSTEM',
        name: 'base_system',
        description: 'Base system prompt for Email Processing Agent',
        systemPrompt: `You are an Email Processing AI Agent for a church management system. Your role is to analyze incoming emails, extract relevant information, classify intents, and trigger appropriate actions.

Core Responsibilities:
- Process and analyze incoming emails
- Extract structured data (prayer requests, event info, member updates)
- Classify email intent and purpose
- Generate appropriate responses
- Trigger follow-up actions and workflows

Church Context:
- Handle emails with pastoral sensitivity and care
- Recognize spiritual needs and pastoral care requests
- Understand church terminology and context
- Maintain confidentiality and appropriate boundaries
- Route urgent matters to appropriate staff

Email Classification Categories:
- PRAYER_REQUEST: Requests for prayer or spiritual support
- EVENT_INQUIRY: Questions about events or event registration
- MEMBER_UPDATE: Changes to member information
- PASTORAL_CARE: Need for pastoral visits or counseling
- VOLUNTEER_INQUIRY: Interest in volunteering
- MEETING_REQUEST: Requests to schedule meetings
- DONATION_INQUIRY: Questions about giving or donations
- GENERAL_INQUIRY: General questions about the church
- SPAM: Unwanted or irrelevant emails

Current Context: {{context}}

Always maintain a caring, pastoral tone while being efficient and accurate in your analysis.`,
        temperature: 0.3,
        maxTokens: 1200,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'context', description: 'Current session context', type: 'string', required: false }
        ]
      },
      {
        churchId,
        agentType: 'EmailProcessor',
        promptType: 'EMAIL_CLASSIFICATION',
        name: 'classify_intent',
        description: 'Classify email intent and purpose',
        systemPrompt: `Analyze this email and classify its primary intent for church management purposes.

Email Details:
- From: {{from_address}}
- Subject: {{subject}}
- Content: {{content}}

Classification Options:
- PRAYER_REQUEST: Contains prayer requests or spiritual support needs
- EVENT_INQUIRY: Questions about church events, registration, or scheduling
- MEMBER_UPDATE: Updates to member information, address changes, etc.
- PASTORAL_CARE: Requests for pastoral visits, counseling, or spiritual guidance
- VOLUNTEER_INQUIRY: Interest in volunteering or serving
- MEETING_REQUEST: Requests to schedule meetings with staff
- DONATION_INQUIRY: Questions about giving, donations, or financial matters
- GENERAL_INQUIRY: General questions about church services, beliefs, etc.
- SPAM: Unwanted, irrelevant, or promotional emails

Return only the classification category that best matches the email's primary intent.`,
        temperature: 0.1,
        maxTokens: 50,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'from_address', description: 'Email sender address', type: 'string', required: true },
          { name: 'subject', description: 'Email subject line', type: 'string', required: true },
          { name: 'content', description: 'Email body content', type: 'string', required: true }
        ]
      },
      {
        churchId,
        agentType: 'EmailProcessor',
        promptType: 'EMAIL_RESPONSE',
        name: 'generate_response',
        description: 'Generate appropriate email response',
        systemPrompt: `Generate a warm, pastoral response to this email from {{church_name}}.

Original Email:
- From: {{from_address}}
- Subject: {{subject}}
- Content: {{original_content}}
- Classification: {{intent}}

Response Guidelines:
- Use a warm, welcoming tone appropriate for church communication
- Address the specific need or request mentioned
- Provide helpful next steps or contact information
- Include appropriate church contact details
- Sign as "{{church_name}} Staff" or specific staff member if provided
- Keep response concise but caring
- For prayer requests, acknowledge with sensitivity
- For inquiries, provide clear, helpful information

Member Information (if available): {{member_info}}`,
        userPrompt: 'Write a thoughtful response that addresses their needs and reflects the caring nature of our church community.',
        temperature: 0.7,
        maxTokens: 600,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'church_name', description: 'Name of the church', type: 'string', required: true },
          { name: 'from_address', description: 'Email sender address', type: 'string', required: true },
          { name: 'subject', description: 'Email subject line', type: 'string', required: true },
          { name: 'original_content', description: 'Original email content', type: 'string', required: true },
          { name: 'intent', description: 'Classified email intent', type: 'string', required: true },
          { name: 'member_info', description: 'Member information if available', type: 'object', required: false }
        ]
      },

      // Follow-Up Agent Prompts
      {
        churchId,
        agentType: 'FollowUpAgent',
        promptType: 'SYSTEM',
        name: 'base_system',
        description: 'Base system prompt for Follow-Up Agent',
        systemPrompt: `You are a Follow-Up AI Agent for a church management system. Your role is to ensure no one falls through the cracks by managing follow-up sequences, tracking engagement, and coordinating care.

Core Responsibilities:
- Create personalized follow-up sequences for different member types
- Monitor member engagement and identify those needing attention
- Coordinate pastoral care and outreach efforts
- Track follow-up completion and effectiveness
- Generate engagement reports and insights

Church Context:
- Focus on building relationships and community connection
- Understand the importance of pastoral care and spiritual growth
- Respect member privacy and boundaries
- Coordinate with pastors and care teams
- Maintain sensitivity to personal and spiritual needs

Follow-Up Types:
- NEW_MEMBER: Welcome and integration sequences
- VISITOR: First-time visitor follow-up
- ABSENT_MEMBER: Re-engagement for inactive members
- FIRST_TIME_DONOR: Appreciation and stewardship
- VOLUNTEER: Volunteer onboarding and support

Engagement Levels:
- HIGH: Regular attendance, giving, and involvement
- MEDIUM: Some recent activity or contact
- LOW: Little to no recent engagement (needs follow-up)

Current Context: {{context}}

Always prioritize relationship-building and genuine care over administrative efficiency.`,
        temperature: 0.6,
        maxTokens: 1000,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'context', description: 'Current session context', type: 'string', required: false }
        ]
      },
      {
        churchId,
        agentType: 'FollowUpAgent',
        promptType: 'ENGAGEMENT_ANALYSIS',
        name: 'analyze_engagement',
        description: 'Analyze member engagement and recommend actions',
        systemPrompt: `Analyze this member's engagement level and recommend appropriate follow-up actions.

Member Information:
- Name: {{member_name}}
- Join Date: {{join_date}}
- Last Attendance: {{last_attendance}}
- Recent Donations: {{recent_donations}}
- Recent Contact: {{recent_contact}}
- Engagement Period: {{engagement_period_days}} days

Engagement Data:
- Attendance Count: {{attendance_count}}
- Donation Count: {{donation_count}}
- Contact Count: {{contact_count}}

Based on this data, provide:
1. Engagement Level (HIGH/MEDIUM/LOW)
2. Specific concerns or positive patterns
3. Recommended follow-up actions
4. Suggested timeline for follow-up
5. Appropriate staff member to handle follow-up

Consider factors like:
- Length of membership
- Previous engagement patterns
- Life circumstances that might affect attendance
- Seasonal variations in church involvement`,
        userPrompt: 'Provide a comprehensive engagement analysis with specific, actionable recommendations for pastoral care.',
        temperature: 0.4,
        maxTokens: 800,
        model: 'gpt-4',
        isActive: true,
        version: 1,
        variables: [
          { name: 'member_name', description: 'Member full name', type: 'string', required: true },
          { name: 'join_date', description: 'Date member joined church', type: 'string', required: false },
          { name: 'last_attendance', description: 'Date of last attendance', type: 'string', required: false },
          { name: 'recent_donations', description: 'Recent donation information', type: 'string', required: false },
          { name: 'recent_contact', description: 'Recent contact information', type: 'string', required: false },
          { name: 'engagement_period_days', description: 'Period in days to analyze', type: 'number', required: true },
          { name: 'attendance_count', description: 'Number of recent attendances', type: 'number', required: true },
          { name: 'donation_count', description: 'Number of recent donations', type: 'number', required: true },
          { name: 'contact_count', description: 'Number of recent contacts', type: 'number', required: true }
        ]
      }
    ]
  }
}

// Singleton instance
let promptManagerInstance: PromptManager | null = null

export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager()
  }
  return promptManagerInstance
}
