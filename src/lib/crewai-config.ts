import { supabase } from './supabase'

// Database-driven CrewAI configuration types
export interface AgentConfig {
  id: string
  church_id: string
  name: string
  role: string
  goal: string
  backstory: string
  description?: string
  is_active: boolean
  max_execution_time: number
  max_iterations: number
  allow_delegation: boolean
  verbose: boolean
  memory_enabled: boolean
  system_template?: string
  prompt_template?: string
  response_template?: string
  llm_config: Record<string, any>
  tools: string[]
  metadata: Record<string, any>
}

export interface ToolConfig {
  id: string
  church_id: string
  name: string
  description: string
  tool_type: 'langchain' | 'custom' | 'api'
  implementation: string
  parameters_schema: Record<string, any>
  return_schema: Record<string, any>
  is_active: boolean
  requires_approval: boolean
  rate_limit: number
  timeout: number
  metadata: Record<string, any>
}

export interface CrewConfig {
  id: string
  church_id: string
  name: string
  description?: string
  process_type: 'sequential' | 'hierarchical'
  manager_llm_config: Record<string, any>
  is_active: boolean
  max_rpm: number
  memory_enabled: boolean
  verbose: boolean
  metadata: Record<string, any>
}

export interface TaskConfig {
  id: string
  church_id: string
  crew_id: string
  name: string
  description: string
  expected_output?: string
  agent_id?: string
  task_type: string
  context: Record<string, any>
  tools: string[]
  async_execution: boolean
  human_input: boolean
  output_json: boolean
  output_pydantic: boolean
  output_file?: string
  callback_url?: string
}

export interface CrewExecution {
  id: string
  church_id: string
  crew_id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  inputs: Record<string, any>
  outputs: Record<string, any>
  error_message?: string
  started_at?: string
  completed_at?: string
  execution_time?: number
  tokens_used: number
  cost_estimate: number
  triggered_by: string
  trigger_data: Record<string, any>
  metadata: Record<string, any>
}

export class CrewAIConfigService {
  private static instance: CrewAIConfigService
  
  static getInstance(): CrewAIConfigService {
    if (!CrewAIConfigService.instance) {
      CrewAIConfigService.instance = new CrewAIConfigService()
    }
    return CrewAIConfigService.instance
  }

  // Agent Configuration Management
  async getAgentConfigs(churchId: string): Promise<AgentConfig[]> {
    const { data, error } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching agent configs:', error)
      return []
    }

    return data || []
  }

  async createAgentConfig(config: Omit<AgentConfig, 'id'>): Promise<AgentConfig | null> {
    const { data, error } = await supabase
      .from('agent_definitions')
      .insert(config)
      .select()
      .single()

    if (error) {
      console.error('Error creating agent config:', error)
      return null
    }

    return data
  }

  async updateAgentConfig(id: string, updates: Partial<AgentConfig>): Promise<boolean> {
    const { error } = await supabase
      .from('agent_definitions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating agent config:', error)
      return false
    }

    return true
  }

  // Tool Configuration Management
  async getToolConfigs(churchId: string): Promise<ToolConfig[]> {
    const { data, error } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching tool configs:', error)
      return []
    }

    return data || []
  }

  async createToolConfig(config: Omit<ToolConfig, 'id'>): Promise<ToolConfig | null> {
    const { data, error } = await supabase
      .from('tool_definitions')
      .insert(config)
      .select()
      .single()

    if (error) {
      console.error('Error creating tool config:', error)
      return null
    }

    return data
  }

  // Crew Configuration Management
  async getCrewConfigs(churchId: string): Promise<CrewConfig[]> {
    const { data, error } = await supabase
      .from('crew_definitions')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching crew configs:', error)
      return []
    }

    return data || []
  }

  async getCrewWithDetails(crewId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_crew_with_agents', { crew_uuid: crewId })

    if (error) {
      console.error('Error fetching crew details:', error)
      return null
    }

    return data
  }

  async createCrewConfig(config: Omit<CrewConfig, 'id'>): Promise<CrewConfig | null> {
    const { data, error } = await supabase
      .from('crew_definitions')
      .insert(config)
      .select()
      .single()

    if (error) {
      console.error('Error creating crew config:', error)
      return null
    }

    return data
  }

  // Task Configuration Management
  async getTaskConfigs(crewId: string): Promise<TaskConfig[]> {
    const { data, error } = await supabase
      .from('task_definitions')
      .select('*')
      .eq('crew_id', crewId)
      .order('name')

    if (error) {
      console.error('Error fetching task configs:', error)
      return []
    }

    return data || []
  }

  async createTaskConfig(config: Omit<TaskConfig, 'id'>): Promise<TaskConfig | null> {
    const { data, error } = await supabase
      .from('task_definitions')
      .insert(config)
      .select()
      .single()

    if (error) {
      console.error('Error creating task config:', error)
      return null
    }

    return data
  }

  // Crew Execution Management
  async createCrewExecution(execution: Omit<CrewExecution, 'id'>): Promise<CrewExecution | null> {
    const { data, error } = await supabase
      .from('crew_executions')
      .insert(execution)
      .select()
      .single()

    if (error) {
      console.error('Error creating crew execution:', error)
      return null
    }

    return data
  }

  async updateCrewExecution(id: string, updates: Partial<CrewExecution>): Promise<boolean> {
    const { error } = await supabase
      .from('crew_executions')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating crew execution:', error)
      return false
    }

    return true
  }

  async getCrewExecutions(churchId: string, limit: number = 50): Promise<CrewExecution[]> {
    const { data, error } = await supabase
      .from('crew_executions')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching crew executions:', error)
      return []
    }

    return data || []
  }

  // Agent Memory Management
  async storeAgentMemory(
    agentId: string,
    churchId: string,
    memoryType: 'short_term' | 'long_term' | 'entity' | 'episodic',
    content: string,
    context: Record<string, any> = {},
    relevanceScore: number = 0.5
  ): Promise<boolean> {
    const { error } = await supabase
      .from('agent_memory')
      .insert({
        agent_id: agentId,
        church_id: churchId,
        memory_type: memoryType,
        content,
        context,
        relevance_score: relevanceScore
      })

    if (error) {
      console.error('Error storing agent memory:', error)
      return false
    }

    return true
  }

  async getAgentMemory(
    agentId: string,
    memoryType?: string,
    limit: number = 100
  ): Promise<any[]> {
    let query = supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agentId)

    if (memoryType) {
      query = query.eq('memory_type', memoryType)
    }

    const { data, error } = await query
      .order('relevance_score', { ascending: false })
      .order('last_accessed', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching agent memory:', error)
      return []
    }

    return data || []
  }

  // Execution Logging
  async logAgentExecution(log: {
    crew_execution_id: string
    agent_id: string
    task_id?: string
    step_number: number
    action: string
    action_input?: Record<string, any>
    observation?: string
    thought?: string
    tool_used?: string
    tool_input?: Record<string, any>
    tool_output?: Record<string, any>
    tokens_used?: number
    execution_time?: number
  }): Promise<boolean> {
    const { error } = await supabase
      .from('agent_execution_logs')
      .insert(log)

    if (error) {
      console.error('Error logging agent execution:', error)
      return false
    }

    return true
  }

  // Predefined Agent Templates for Church Operations
  getDefaultAgentTemplates(): Partial<AgentConfig>[] {
    return [
      {
        name: 'Pastoral Care Coordinator',
        role: 'Pastoral Care Specialist',
        goal: 'Identify members who need pastoral care and coordinate appropriate support',
        backstory: 'You are an experienced pastoral care coordinator with deep understanding of church community dynamics. You excel at recognizing when members need support and connecting them with appropriate care resources.',
        tools: ['member_lookup', 'communication_sender', 'care_scheduler', 'prayer_request_manager'],
        llm_config: { model: 'gpt-4', temperature: 0.7 },
        max_execution_time: 300,
        allow_delegation: true,
        memory_enabled: true
      },
      {
        name: 'Fellowship Matchmaker',
        role: 'Community Connection Specialist',
        goal: 'Create meaningful connections between church members based on shared interests and life circumstances',
        backstory: 'You are a skilled community builder who understands the importance of fellowship in spiritual growth. You have an intuitive ability to identify compatible personalities and shared interests that can lead to lasting friendships.',
        tools: ['member_matching', 'interest_analyzer', 'introduction_creator', 'event_recommender'],
        llm_config: { model: 'gpt-4', temperature: 0.8 },
        max_execution_time: 240,
        allow_delegation: false,
        memory_enabled: true
      },
      {
        name: 'Event Follow-up Specialist',
        role: 'Engagement Coordinator',
        goal: 'Ensure proper follow-up with event attendees and maximize engagement opportunities',
        backstory: 'You are a detail-oriented engagement specialist who understands that meaningful follow-up is crucial for building lasting relationships. You excel at creating personalized follow-up strategies.',
        tools: ['event_analyzer', 'attendee_tracker', 'follow_up_scheduler', 'engagement_scorer'],
        llm_config: { model: 'gpt-3.5-turbo', temperature: 0.6 },
        max_execution_time: 180,
        allow_delegation: false,
        memory_enabled: true
      },
      {
        name: 'Giving Insights Analyst',
        role: 'Stewardship Advisor',
        goal: 'Analyze giving patterns and provide insights for healthy stewardship practices',
        backstory: 'You are a wise stewardship advisor with deep understanding of biblical principles around giving. You provide insights that help both leadership and members grow in their stewardship journey.',
        tools: ['giving_analyzer', 'trend_detector', 'stewardship_recommender', 'report_generator'],
        llm_config: { model: 'gpt-4', temperature: 0.5 },
        max_execution_time: 360,
        allow_delegation: true,
        memory_enabled: true
      },
      {
        name: 'Ministry Coordinator',
        role: 'Ministry Operations Manager',
        goal: 'Optimize ministry operations and volunteer coordination',
        backstory: 'You are an experienced ministry operations manager who understands the complexities of coordinating volunteers and ministry activities. You excel at identifying opportunities for improvement and growth.',
        tools: ['volunteer_matcher', 'ministry_analyzer', 'schedule_optimizer', 'resource_planner'],
        llm_config: { model: 'gpt-4', temperature: 0.7 },
        max_execution_time: 300,
        allow_delegation: true,
        memory_enabled: true
      }
    ]
  }
}

// Export singleton instance
export const crewAIConfig = CrewAIConfigService.getInstance()
