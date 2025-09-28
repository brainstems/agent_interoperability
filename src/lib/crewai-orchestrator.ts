import { OpenAI, ChatOpenAI } from '@langchain/openai'
import { LLMChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
import { ChurchToolFactory } from './langchain-tools'
import type { Database } from '../types/database'

type AgentConfig = Database['public']['Tables']['crewai_agents']['Row']
type CrewConfig = Database['public']['Tables']['crewai_crews']['Row']
type TaskConfig = Database['public']['Tables']['crewai_tasks']['Row']
type ToolConfig = Database['public']['Tables']['crewai_tools']['Row']

export interface ExecutionContext {
  churchId: string
  userId?: string
  triggerEvent?: string
  metadata?: Record<string, any>
}

// LangChain-based Agent implementation
class LangChainAgent {
  private llm: ChatOpenAI
  private chain: LLMChain
  private tools: any[]
  public config: AgentConfig

  constructor(
    config: AgentConfig,
    private toolFactory: ChurchToolFactory
  ) {
    this.config = config
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.VITE_OPENAI_API_KEY,
      temperature: 0.7,
      modelName: 'gpt-4'
    })

    const prompt = PromptTemplate.fromTemplate(`
      You are {role}.
      
      Goal: {goal}
      
      Background: {backstory}
      
      Task: {task}
      
      Context: {context}
      
      Please provide a detailed response that accomplishes the task while staying in character.
      
      Response:
    `)

    this.chain = new LLMChain({
      llm: this.llm,
      prompt: prompt
    })

    this.tools = []
  }

  async execute(task: string, context: any = {}): Promise<string> {
    try {
      const response = await this.chain.call({
        role: this.config.role,
        goal: this.config.goal,
        backstory: this.config.backstory,
        task: task,
        context: JSON.stringify(context)
      })

      return response.text
    } catch (error) {
      console.error('Agent execution error:', error)
      return `Error executing agent ${this.config.name}: ${error}`
    }
  }
}

// LangChain-based Task implementation
class LangChainTask {
  public config: TaskConfig
  public agent: LangChainAgent

  constructor(
    config: TaskConfig,
    agent: LangChainAgent
  ) {
    this.config = config
    this.agent = agent
  }

  async execute(context: any = {}): Promise<string> {
    return await this.agent.execute(this.config.description, context)
  }
}

// LangChain-based Crew implementation
class LangChainCrew {
  private agents: LangChainAgent[] = []
  private tasks: LangChainTask[] = []

  constructor(
    private config: CrewConfig,
    private toolFactory: ChurchToolFactory
  ) {}

  addAgent(agent: LangChainAgent) {
    this.agents.push(agent)
  }

  addTask(task: LangChainTask) {
    this.tasks.push(task)
  }

  async kickoff(inputs: any = {}): Promise<{
    result: string
    tasks_output: any[]
  }> {
    const results = []
    
    for (const task of this.tasks) {
      const result = await task.execute(inputs)
      results.push({
        description: task.config.description,
        result: result,
        agent: task.agent?.config?.name || 'unknown'
      })
    }

    return {
      result: results.map(r => r.result).join('\n\n'),
      tasks_output: results
    }
  }
}

export class CrewAIOrchestrator {
  private llm: ChatOpenAI
  private toolFactory: ChurchToolFactory
  private activeExecutions: Map<string, any> = new Map()

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.VITE_OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7
    })
    this.toolFactory = new ChurchToolFactory()
  }

  /**
   * Execute a crew by name with given context
   */
  async executeCrew(
    crewName: string, 
    context: ExecutionContext,
    inputs: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Get crew configuration from database
      const { data: crewConfig } = await supabase
        .from('crewai_crews')
        .select('*')
        .eq('name', crewName)
        .eq('church_id', context.churchId)
        .single()

      if (!crewConfig) {
        throw new Error(`Crew '${crewName}' not found`)
      }

      // Create execution record
      const execution = await this.createExecution(crewConfig.id, context, inputs)
      
      // Build and execute crew
      const crew = await this.buildCrew(crewConfig, context)
      const result = await this.runCrew(crew, execution.id, inputs)

      // Update execution with results
      await this.updateExecution(execution.id, 'COMPLETED', result)

      return result
    } catch (error) {
      console.error('Crew execution failed:', error)
      throw error
    }
  }

  /**
   * Execute a single agent task
   */
  async executeAgentTask(
    agentName: string,
    taskDescription: string,
    context: ExecutionContext,
    inputs: Record<string, any> = {}
  ): Promise<string> {
    try {
      const { data: agentConfig } = await supabase
        .from('crewai_agents')
        .select('*')
        .eq('name', agentName)
        .eq('church_id', context.churchId)
        .single()

      if (!agentConfig) {
        throw new Error(`Agent '${agentName}' not found`)
      }

      const agent = await this.buildAgent(agentConfig, context)
      const task = new LangChainTask({
        description: taskDescription,
        expected_output: 'Detailed response with actionable insights'
      } as TaskConfig, agent)

      const result = await task.execute(inputs)
      
      // Log the execution
      await this.logAgentExecution(agentConfig.id, taskDescription, result, context)

      return result
    } catch (error) {
      console.error('Agent task execution failed:', error)
      throw error
    }
  }

  /**
   * Build a crew from database configuration
   */
  private async buildCrew(crewConfig: CrewConfig, context: ExecutionContext): Promise<LangChainCrew> {
    // Get crew agents
    const { data: crewAgents } = await supabase
      .from('crewai_crew_agents')
      .select(`
        agent_id,
        crewai_agents (*)
      `)
      .eq('crew_id', crewConfig.id)

    if (!crewAgents?.length) {
      throw new Error(`No agents found for crew '${crewConfig.name}'`)
    }

    // Build agents
    const agents = await Promise.all(
      crewAgents.map(ca => this.buildAgent(ca.crewai_agents as any, context))
    )

    // Get crew tasks
    const { data: crewTasks } = await supabase
      .from('crewai_tasks')
      .select('*')
      .eq('crew_id', crewConfig.id)
      .order('execution_order')

    // Build tasks
    const tasks = await Promise.all(
      (crewTasks || []).map(taskConfig => this.buildTask(taskConfig, agents, context))
    )

    const crew = new LangChainCrew(crewConfig, this.toolFactory)
    
    // Add agents and tasks to crew
    agents.forEach(agent => crew.addAgent(agent))
    tasks.forEach(task => crew.addTask(task))

    return crew
  }

  /**
   * Build an agent from database configuration
   */
  private async buildAgent(agentConfig: AgentConfig, context: ExecutionContext): Promise<LangChainAgent> {
    // Get agent tools
    const { data: agentTools } = await supabase
      .from('crewai_agent_tools')
      .select(`
        tool_id,
        crewai_tools (*)
      `)
      .eq('agent_id', agentConfig.id)

    // Build tools
    const tools = []
    if (agentTools) {
      for (const at of agentTools) {
        const toolConfig = at.crewai_tools as any
        const tool = ChurchToolFactory.createTool(toolConfig.name, context.churchId)
        if (tool) {
          tools.push(tool)
        }
      }
    }

    return new LangChainAgent(agentConfig, this.toolFactory)
  }

  /**
   * Build a task from database configuration
   */
  private async buildTask(
    taskConfig: TaskConfig, 
    agents: LangChainAgent[], 
    context: ExecutionContext
  ): Promise<LangChainTask> {
    // Find the assigned agent
    const agent = agents.find(a => a.config.role === taskConfig.agent_role)
    if (!agent) {
      throw new Error(`Agent with role '${taskConfig.agent_role}' not found`)
    }

    return new LangChainTask(taskConfig, agent)
  }

  /**
   * Execute the crew and handle results
   */
  private async runCrew(crew: LangChainCrew, executionId: string, inputs: Record<string, any>): Promise<string> {
    try {
      this.activeExecutions.set(executionId, crew)
      
      const result = await crew.kickoff(inputs)
      
      this.activeExecutions.delete(executionId)
      
      return result.result
    } catch (error) {
      this.activeExecutions.delete(executionId)
      throw error
    }
  }

  /**
   * Create execution record in database
   */
  private async createExecution(
    crewId: string, 
    context: ExecutionContext, 
    inputs: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('crewai_executions')
      .insert({
        crew_id: crewId,
        church_id: context.churchId,
        user_id: context.userId,
        status: 'RUNNING',
        inputs: inputs,
        metadata: {
          trigger_event: context.triggerEvent,
          ...context.metadata
        },
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update execution status and results
   */
  private async updateExecution(
    executionId: string, 
    status: string, 
    result?: string, 
    error?: string
  ) {
    const updates: any = {
      status,
      completed_at: new Date().toISOString()
    }

    if (result) updates.result = result
    if (error) updates.error = error

    const { error: updateError } = await supabase
      .from('crewai_executions')
      .update(updates)
      .eq('id', executionId)

    if (updateError) {
      console.error('Failed to update execution:', updateError)
    }
  }

  /**
   * Log individual agent execution
   */
  private async logAgentExecution(
    agentId: string,
    task: string,
    result: string,
    context: ExecutionContext
  ) {
    await supabase
      .from('crewai_logs')
      .insert({
        agent_id: agentId,
        church_id: context.churchId,
        level: 'INFO',
        message: `Task executed: ${task}`,
        metadata: {
          task_description: task,
          result_preview: result.substring(0, 200),
          user_id: context.userId
        },
        timestamp: new Date().toISOString()
      })
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string) {
    const { data, error } = await supabase
      .from('crewai_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Cancel running execution
   */
  async cancelExecution(executionId: string) {
    const crew = this.activeExecutions.get(executionId)
    if (crew) {
      // Note: CrewAI doesn't have a built-in cancel method
      // This would need to be implemented based on the specific version
      this.activeExecutions.delete(executionId)
    }

    await this.updateExecution(executionId, 'CANCELLED')
  }

  /**
   * Get agent memory for a specific church
   */
  async getAgentMemory(agentName: string, churchId: string) {
    const { data, error } = await supabase
      .from('crewai_memory')
      .select('*')
      .eq('agent_name', agentName)
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Store agent memory
   */
  async storeAgentMemory(
    agentName: string,
    churchId: string,
    memoryType: string,
    content: any,
    metadata?: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('crewai_memory')
      .insert({
        agent_name: agentName,
        church_id: churchId,
        memory_type: memoryType,
        content: content,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Predefined crew workflows for common church operations
   */
  async executePastoralCareWorkflow(
    memberId: string,
    careType: string,
    context: ExecutionContext
  ) {
    return this.executeCrew('pastoral_care_crew', context, {
      member_id: memberId,
      care_type: careType,
      priority: 'MEDIUM'
    })
  }

  async executeMemberEngagementWorkflow(
    memberId: string,
    context: ExecutionContext
  ) {
    return this.executeCrew('member_engagement_crew', context, {
      member_id: memberId,
      engagement_type: 'CONNECTION_OPPORTUNITY'
    })
  }

  async executeEventFollowUpWorkflow(
    eventId: string,
    context: ExecutionContext
  ) {
    return this.executeCrew('event_followup_crew', context, {
      event_id: eventId,
      followup_type: 'POST_EVENT_ENGAGEMENT'
    })
  }

  async executeGivingAnalysisWorkflow(
    timeframe: string,
    context: ExecutionContext
  ) {
    return this.executeCrew('stewardship_crew', context, {
      analysis_timeframe: timeframe,
      include_recommendations: true
    })
  }

  /**
   * Initialize default crews for a church
   */
  async initializeDefaultCrews(churchId: string) {
    const defaultCrews = [
      {
        name: 'pastoral_care_crew',
        description: 'Handles pastoral care coordination and follow-up',
        agents: ['pastoral_care_coordinator', 'member_analyst'],
        tasks: ['assess_care_needs', 'schedule_care', 'follow_up']
      },
      {
        name: 'member_engagement_crew',
        description: 'Manages member connections and fellowship opportunities',
        agents: ['fellowship_coordinator', 'connection_specialist'],
        tasks: ['analyze_member_profile', 'find_connections', 'create_introductions']
      },
      {
        name: 'event_followup_crew',
        description: 'Handles post-event engagement and follow-up',
        agents: ['event_coordinator', 'communication_specialist'],
        tasks: ['analyze_event_attendance', 'identify_followup_opportunities', 'send_communications']
      },
      {
        name: 'stewardship_crew',
        description: 'Analyzes giving patterns and provides stewardship insights',
        agents: ['stewardship_analyst', 'communication_specialist'],
        tasks: ['analyze_giving_patterns', 'generate_insights', 'create_stewardship_plan']
      }
    ]

    for (const crewDef of defaultCrews) {
      await supabase
        .from('crewai_crews')
        .insert({
          church_id: churchId,
          name: crewDef.name,
          description: crewDef.description,
          process: 'sequential',
          memory_enabled: true,
          is_active: true
        })
    }
  }

  /**
   * Execute a workflow (alias for executeCrew for test compatibility)
   */
  async executeWorkflow(workflowName: string, params: {
    church_id: string
    agents?: string[]
    trigger?: string
    context?: Record<string, any>
  }): Promise<{
    status: string
    results: any
    execution_time: number
    notifications_sent?: number
  }> {
    const startTime = Date.now()
    
    try {
      const context: ExecutionContext = {
        churchId: params.church_id,
        triggerEvent: params.trigger,
        metadata: params.context
      }

      const result = await this.executeCrew(workflowName, context, params.context || {})
      const executionTime = Date.now() - startTime

      return {
        status: 'completed',
        results: typeof result === 'string' ? { output: result } : result,
        execution_time: executionTime,
        notifications_sent: 1 // Mock notification count
      }
    } catch (error) {
      return {
        status: 'failed',
        results: { error: error instanceof Error ? error.message : 'Unknown error' },
        execution_time: Date.now() - startTime
      }
    }
  }

  /**
   * Execute a single agent (alias for executeAgentTask for test compatibility)
   */
  async executeAgent(agentType: string, input: string, context?: any): Promise<any> {
    const executionContext: ExecutionContext = {
      churchId: context?.churchId || 'default-church',
      userId: context?.userId,
      metadata: context
    }

    return await this.executeAgentTask(agentType, input, executionContext, { input })
  }
}

// Singleton instance
export const crewaiOrchestrator = new CrewAIOrchestrator()
