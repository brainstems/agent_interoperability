import { createClient } from '@supabase/supabase-js'
import { getEventBus, EVENT_TYPES } from './event-bus'
import { getJobQueue, JOB_TYPES } from './job-queue'
import { EmailIntegrationService, createEmailService, loadEmailConfig } from './email-integration'
import { 
  BaseAgent, 
  MeetingOrganizerAgent, 
  EmailProcessingAgent, 
  FollowUpAgent 
} from './ai-agent-framework'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface AgentConfig {
  type: string
  enabled: boolean
  maxConcurrentSessions: number
  retryAttempts: number
  timeout: number
  settings: Record<string, any>
}

export interface AgentSession {
  id: string
  churchId: string
  agentType: string
  purpose: string
  context: any
  metadata: any
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED'
  startTime: Date
  endTime?: Date
  result?: any
}

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map()
  private activeSessions: Map<string, AgentSession> = new Map()
  private agentConfigs: Map<string, AgentConfig> = new Map()
  private eventBus = getEventBus()
  private jobQueue = getJobQueue()
  private emailService?: EmailIntegrationService

  constructor() {
    this.initializeAgentConfigs()
    this.initializeEmailService()
    this.setupEventHandlers()
  }

  private initializeAgentConfigs(): void {
    // Default agent configurations
    const defaultConfigs: AgentConfig[] = [
      {
        type: 'meeting_organizer',
        enabled: true,
        maxConcurrentSessions: 3,
        retryAttempts: 2,
        timeout: 300000, // 5 minutes
        settings: {
          defaultMeetingDuration: 60,
          reminderDays: [7, 1]
        }
      },
      {
        type: 'email_processor',
        enabled: true,
        maxConcurrentSessions: 5,
        retryAttempts: 3,
        timeout: 120000, // 2 minutes
        settings: {
          batchSize: 10,
          processingInterval: 30000
        }
      },
      {
        type: 'follow_up',
        enabled: true,
        maxConcurrentSessions: 2,
        retryAttempts: 2,
        timeout: 180000, // 3 minutes
        settings: {
          followUpDelay: 86400000, // 24 hours
          maxFollowUps: 3
        }
      }
    ]

    defaultConfigs.forEach(config => {
      this.agentConfigs.set(config.type, config)
    })
  }

  private async initializeEmailService(churchId?: string): Promise<void> {
    try {
      if (churchId) {
        const emailConfig = await loadEmailConfig(churchId)
        if (emailConfig) {
          this.emailService = createEmailService(emailConfig)
        }
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error)
    }
  }

  private setupEventHandlers(): void {
    // Handle job queue events
    this.jobQueue.on('job:completed', this.handleJobCompleted.bind(this))
    this.jobQueue.on('job:failed', this.handleJobFailed.bind(this))
  }

  // Start an agent session
  async startAgent(
    agentType: string, 
    churchId: string, 
    purpose: string, 
    context: any = {}
  ): Promise<string> {
    const config = this.agentConfigs.get(agentType)
    if (!config || !config.enabled) {
      throw new Error(`Agent type ${agentType} is not available or disabled`)
    }

    // Check concurrent session limits
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.agentType === agentType && session.status === 'ACTIVE')
    
    if (activeSessions.length >= config.maxConcurrentSessions) {
      throw new Error(`Maximum concurrent sessions reached for agent type ${agentType}`)
    }

    // Create agent session
    const { data: session, error } = await supabase
      .from('agent_sessions')
      .insert({
        church_id: churchId,
        agent_type: agentType,
        purpose,
        context: JSON.stringify(context),
        metadata: JSON.stringify({ attempts: 0 }),
        status: 'ACTIVE',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error || !session) {
      throw new Error(`Failed to create agent session: ${error?.message}`)
    }

    // Add to active sessions
    const agentSession: AgentSession = {
      id: session.id,
      churchId: session.church_id,
      agentType: session.agent_type,
      purpose: session.purpose,
      context: JSON.parse(session.context || '{}'),
      metadata: JSON.parse(session.metadata || '{}'),
      status: session.status as 'ACTIVE',
      startTime: new Date(session.started_at)
    }
    
    this.activeSessions.set(session.id, agentSession)

    // Create and start the agent
    const agent = await this.createAgent(agentType, session.id, context, config.settings)
    if (agent) {
      this.agents.set(session.id, agent)
      
      // Start agent processing in background
      this.processAgentSession(session.id, agent, config)
    }

    // Publish start event
    await this.eventBus.publish({
      type: EVENT_TYPES.AGENT_STARTED,
      source: 'agent_orchestrator',
      data: { sessionId: session.id, agentType, purpose },
      churchId
    })

    return session.id
  }

  private async createAgent(
    agentType: string, 
    sessionId: string, 
    context: any, 
    settings: any
  ): Promise<BaseAgent | null> {
    try {
      switch (agentType) {
        case 'meeting_organizer':
          return new MeetingOrganizerAgent(sessionId, context, settings)
        
        case 'email_processor':
          return new EmailProcessingAgent(sessionId, context, settings)
        
        case 'follow_up':
          return new FollowUpAgent(sessionId, context, settings)
        
        default:
          throw new Error(`Unknown agent type: ${agentType}`)
      }
    } catch (error) {
      console.error(`Failed to create agent ${agentType}:`, error)
      return null
    }
  }

  private async processAgentSession(
    sessionId: string, 
    agent: BaseAgent, 
    config: AgentConfig
  ): Promise<void> {
    try {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.cancelAgent(sessionId)
      }, config.timeout)

      // Execute agent
      const session = this.activeSessions.get(sessionId)
      const input = session?.purpose || 'Execute agent task'
      const result = await agent.execute(input, session?.context)
      clearTimeout(timeoutId)

      // Complete session
      await this.completeAgentSession(sessionId, result)
    } catch (error) {
      console.error(`Agent session ${sessionId} failed:`, error)
      await this.failAgentSession(sessionId, error)
    } finally {
      // Cleanup
      this.agents.delete(sessionId)
      this.activeSessions.delete(sessionId)
    }
  }

  // Complete agent session
  private async completeAgentSession(sessionId: string, result: any): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('agent_sessions')
        .update({
          status: 'COMPLETED',
          result: JSON.stringify(result),
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      // Publish completion event
      await this.eventBus.publish({
        type: EVENT_TYPES.AGENT_COMPLETED,
        source: 'agent_orchestrator',
        data: { sessionId, result },
        churchId: session?.church_id
      })
    } catch (error) {
      console.error('Failed to complete agent session:', error)
    }
  }

  // Fail agent session
  private async failAgentSession(sessionId: string, error: any): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      const { data: session } = await supabase
        .from('agent_sessions')
        .update({
          status: 'FAILED',
          result: JSON.stringify({ error: errorMessage }),
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      // Publish failure event
      await this.eventBus.publish({
        type: EVENT_TYPES.AGENT_COMPLETED, // Use AGENT_COMPLETED since AGENT_FAILED doesn't exist
        source: 'agent_orchestrator',
        data: { sessionId, error: errorMessage },
        churchId: session?.church_id
      })
    } catch (error) {
      console.error('Failed to fail agent session:', error)
    }
  }

  // Cancel agent session
  async cancelAgent(sessionId: string): Promise<boolean> {
    try {
      const agent = this.agents.get(sessionId)
      if (agent) {
        await agent.stop()
        this.agents.delete(sessionId)
      }

      // Update session status
      await supabase
        .from('agent_sessions')
        .update({
          status: 'COMPLETED',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      this.activeSessions.delete(sessionId)
      return true
    } catch (error) {
      console.error('Failed to cancel agent:', error)
      return false
    }
  }

  // Event handlers
  private async handleJobCompleted(jobId: string, result: any): Promise<void> {
    // Handle completed background jobs
    console.log(`Job ${jobId} completed:`, result)
  }

  private async handleJobFailed(jobId: string, error: any): Promise<void> {
    // Handle failed background jobs
    console.error(`Job ${jobId} failed:`, error)
  }

  // Get agent sessions with filtering
  async getAgentSessions(filters: {
    churchId: string
    agentType?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<AgentSession[]> {
    let query = supabase
      .from('agent_sessions')
      .select('*')
      .eq('church_id', filters.churchId)
      .order('started_at', { ascending: false })
      .limit(filters.limit || 50)
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)
    
    if (filters.agentType) query = query.eq('agent_type', filters.agentType)
    if (filters.status) query = query.eq('status', filters.status)
    
    const { data: sessions } = await query

    return (sessions || []).map(session => ({
      id: session.id,
      churchId: session.church_id,
      agentType: session.agent_type,
      purpose: session.purpose,
      context: JSON.parse(session.context || '{}'),
      metadata: JSON.parse(session.metadata || '{}'),
      status: session.status,
      startTime: new Date(session.started_at),
      endTime: session.ended_at ? new Date(session.ended_at) : undefined,
      result: session.result ? JSON.parse(session.result) : undefined
    }))
  }

  async getAgentStats(churchId: string): Promise<{
    totalSessions: number
    activeSessions: number
    completedSessions: number
    failedSessions: number
    sessionsByType: Record<string, number>
  }> {
    const [totalResult, activeResult, completedResult, failedResult, byTypeResult] = await Promise.all([
      supabase.from('agent_sessions').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
      supabase.from('agent_sessions').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'ACTIVE'),
      supabase.from('agent_sessions').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'COMPLETED'),
      supabase.from('agent_sessions').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'FAILED'),
      supabase.from('agent_sessions').select('agent_type').eq('church_id', churchId)
    ])
    
    const total = totalResult.count || 0
    const active = activeResult.count || 0
    const completed = completedResult.count || 0
    const failed = failedResult.count || 0
    const byType = (byTypeResult.data || []).reduce((acc: any, item: any) => {
      acc[item.agent_type] = (acc[item.agent_type] || 0) + 1
      return acc
    }, {})

    return {
      totalSessions: total,
      activeSessions: active,
      completedSessions: completed,
      failedSessions: failed,
      sessionsByType: byType
    }
  }

  // Get active agent sessions
  getActiveAgents(): string[] {
    return Array.from(this.activeSessions.keys())
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Stop all active agents
    for (const sessionId of Array.from(this.activeSessions.keys())) {
      await this.cancelAgent(sessionId)
    }
    
    // Clear maps
    this.agents.clear()
    this.activeSessions.clear()
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator()
