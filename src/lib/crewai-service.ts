import { supabase } from './supabase'
import { ChurchToolFactory } from './langchain-tools'

export interface CrewAIExecution {
  id: string
  crew_name: string
  church_id: string
  user_id?: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  inputs: Record<string, any>
  result?: string
  error?: string
  metadata?: Record<string, any>
  started_at?: string
  completed_at?: string
}

export interface AgentConfig {
  id: string
  name: string
  role: string
  goal: string
  backstory: string
  tools: string[]
  allow_delegation: boolean
  max_iterations: number
  memory_enabled: boolean
  is_active: boolean
}

export interface CrewConfig {
  id: string
  name: string
  description: string
  process: 'sequential' | 'hierarchical'
  memory_enabled: boolean
  is_active: boolean
}

export class CrewAIService {
  private static instance: CrewAIService

  static getInstance(): CrewAIService {
    if (!CrewAIService.instance) {
      CrewAIService.instance = new CrewAIService()
    }
    return CrewAIService.instance
  }

  /**
   * Execute a crew workflow
   */
  async executeCrew(
    crewName: string,
    churchId: string,
    inputs: Record<string, any> = {},
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Call the CrewAI processor Edge Function
      const { data, error } = await supabase.functions.invoke('crewai-processor', {
        body: {
          crew_name: crewName,
          church_id: churchId,
          user_id: userId,
          inputs: inputs,
          metadata: metadata
        }
      })

      if (error) {
        throw new Error(`CrewAI execution failed: ${error.message}`)
      }

      return data.result || 'Crew execution completed'
    } catch (error) {
      console.error('CrewAI execution error:', error)
      throw error
    }
  }

  /**
   * Execute a single agent task
   */
  async executeAgent(
    agentName: string,
    taskDescription: string,
    churchId: string,
    inputs: Record<string, any> = {},
    userId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('crewai-processor', {
        body: {
          agent_name: agentName,
          task_description: taskDescription,
          church_id: churchId,
          user_id: userId,
          inputs: inputs
        }
      })

      if (error) {
        throw new Error(`Agent execution failed: ${error.message}`)
      }

      return data.result || 'Agent task completed'
    } catch (error) {
      console.error('Agent execution error:', error)
      throw error
    }
  }

  /**
   * Predefined workflow methods
   */
  async executePastoralCareWorkflow(
    memberId: string,
    careType: string,
    churchId: string,
    userId?: string
  ): Promise<string> {
    return this.executeCrew('pastoral_care_crew', churchId, {
      member_id: memberId,
      care_type: careType,
      priority: 'MEDIUM'
    }, userId, { workflow: 'pastoral_care' })
  }

  async executeMemberEngagementWorkflow(
    memberId: string,
    churchId: string,
    userId?: string
  ): Promise<string> {
    return this.executeCrew('member_engagement_crew', churchId, {
      member_id: memberId,
      engagement_type: 'CONNECTION_OPPORTUNITY'
    }, userId, { workflow: 'member_engagement' })
  }

  async executeEventFollowUpWorkflow(
    eventId: string,
    churchId: string,
    userId?: string
  ): Promise<string> {
    return this.executeCrew('event_followup_crew', churchId, {
      event_id: eventId,
      followup_type: 'POST_EVENT_ENGAGEMENT'
    }, userId, { workflow: 'event_followup' })
  }

  async executeGivingAnalysisWorkflow(
    timeframe: string,
    churchId: string,
    userId?: string
  ): Promise<string> {
    return this.executeCrew('stewardship_crew', churchId, {
      analysis_timeframe: timeframe,
      include_recommendations: true
    }, userId, { workflow: 'giving_analysis' })
  }

  /**
   * Configuration management
   */
  async getAgents(churchId: string): Promise<AgentConfig[]> {
    const { data, error } = await supabase
      .from('crewai_agents')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching agents:', error)
      return []
    }

    return data || []
  }

  async getCrews(churchId: string): Promise<CrewConfig[]> {
    const { data, error } = await supabase
      .from('crewai_crews')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching crews:', error)
      return []
    }

    return data || []
  }

  async getExecutions(churchId: string, limit: number = 50): Promise<CrewAIExecution[]> {
    const { data, error } = await supabase
      .from('crewai_executions')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching executions:', error)
      return []
    }

    return data || []
  }

  /**
   * Initialize default agents and crews for a church
   */
  async initializeDefaultConfiguration(churchId: string): Promise<void> {
    try {
      // Create default agents
      const defaultAgents = [
        {
          church_id: churchId,
          name: 'pastoral_care_coordinator',
          role: 'Pastoral Care Coordinator',
          goal: 'Coordinate and manage pastoral care activities for church members',
          backstory: 'You are an experienced pastoral care coordinator who understands the importance of timely and compassionate care for church members. You excel at identifying care needs and coordinating appropriate responses.',
          tools: ['member_lookup', 'care_scheduler', 'communication_sender'],
          allow_delegation: true,
          max_iterations: 5,
          memory_enabled: true,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'fellowship_coordinator',
          role: 'Fellowship Coordinator',
          goal: 'Foster meaningful connections and relationships within the church community',
          backstory: 'You are passionate about building community and helping people connect. You have a gift for identifying common interests and facilitating introductions that lead to lasting friendships.',
          tools: ['member_lookup', 'member_matching', 'introduction_creator'],
          allow_delegation: false,
          max_iterations: 3,
          memory_enabled: true,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'communication_specialist',
          role: 'Communication Specialist',
          goal: 'Ensure effective and timely communication with church members',
          backstory: 'You are skilled at crafting clear, engaging, and appropriate communications for different audiences. You understand the importance of personalized messaging and timing.',
          tools: ['member_lookup', 'communication_sender'],
          allow_delegation: false,
          max_iterations: 3,
          memory_enabled: false,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'stewardship_analyst',
          role: 'Stewardship Analyst',
          goal: 'Analyze giving patterns and provide insights for stewardship growth',
          backstory: 'You have expertise in financial analysis and stewardship principles. You help churches understand giving trends and develop strategies for healthy stewardship culture.',
          tools: ['giving_analyzer', 'member_lookup', 'communication_sender'],
          allow_delegation: false,
          max_iterations: 5,
          memory_enabled: true,
          is_active: true
        }
      ]

      // Insert agents
      for (const agent of defaultAgents) {
        const { error } = await supabase
          .from('crewai_agents')
          .insert(agent)

        if (error && !error.message.includes('duplicate')) {
          console.error('Error creating agent:', error)
        }
      }

      // Create default crews
      const defaultCrews = [
        {
          church_id: churchId,
          name: 'pastoral_care_crew',
          description: 'Handles pastoral care coordination and follow-up',
          process: 'sequential',
          memory_enabled: true,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'member_engagement_crew',
          description: 'Manages member connections and fellowship opportunities',
          process: 'sequential',
          memory_enabled: true,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'event_followup_crew',
          description: 'Handles post-event engagement and follow-up',
          process: 'sequential',
          memory_enabled: false,
          is_active: true
        },
        {
          church_id: churchId,
          name: 'stewardship_crew',
          description: 'Analyzes giving patterns and provides stewardship insights',
          process: 'sequential',
          memory_enabled: true,
          is_active: true
        }
      ]

      // Insert crews
      for (const crew of defaultCrews) {
        const { error } = await supabase
          .from('crewai_crews')
          .insert(crew)

        if (error && !error.message.includes('duplicate')) {
          console.error('Error creating crew:', error)
        }
      }

      console.log('Default CrewAI configuration initialized for church:', churchId)
    } catch (error) {
      console.error('Error initializing default configuration:', error)
      throw error
    }
  }

  /**
   * Real-time monitoring
   */
  subscribeToExecutions(churchId: string, callback: (execution: CrewAIExecution) => void) {
    return supabase
      .channel(`crewai_executions_${churchId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'crewai_executions',
          filter: `church_id=eq.${churchId}`
        },
        (payload) => {
          callback(payload.new as CrewAIExecution)
        }
      )
      .subscribe()
  }

  /**
   * Get available tools
   */
  getAvailableTools(): string[] {
    return ChurchToolFactory.getAvailableTools()
  }
}

// Export singleton instance
export const crewaiService = CrewAIService.getInstance()
