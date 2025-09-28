import { supabase } from './supabase'
import { crewaiOrchestrator, ExecutionContext } from './crewai-orchestrator'

export interface AgentTask {
  id?: string
  church_id?: string
  task_type: string
  payload: any
  status?: string
  priority?: number
  scheduled_at?: string
  started_at?: string | null
  completed_at?: string | null
  attempts?: number
  max_attempts?: number
  last_error?: string | null
  result?: any | null
}

// Enhanced task interface for CrewAI integration
export interface CrewAITask {
  crew_name?: string
  agent_name?: string
  task_description?: string
  church_id: string
  user_id?: string
  inputs?: Record<string, any>
  trigger_event?: string
  metadata?: Record<string, any>
}

export class AIAgentService {
  private static instance: AIAgentService
  
  static getInstance(): AIAgentService {
    if (!AIAgentService.instance) {
      AIAgentService.instance = new AIAgentService()
    }
    return AIAgentService.instance
  }

  // Queue a new agent task
  async queueTask(task: Omit<AgentTask, 'id' | 'created_at' | 'updated_at'>): Promise<AgentTask | null> {
    try {
      const { data, error } = await supabase
        .from('agent_tasks')
        .insert({
          ...task,
          status: task.status || 'PENDING',
          priority: task.priority || 5,
          scheduled_at: task.scheduled_at || new Date().toISOString(),
          attempts: 0,
          max_attempts: task.max_attempts || 3
        })
        .select()
        .single()

      if (error) {
        console.error('Error queueing agent task:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error queueing agent task:', error)
      return null
    }
  }

  // Process a task using Supabase Edge Function or CrewAI
  async processTask(taskId: string): Promise<boolean> {
    try {
      // Get the task
      const { data: task, error: taskError } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        console.error('Task not found:', taskError)
        return false
      }

      // Update task status to in progress
      await supabase
        .from('agent_tasks')
        .update({
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
          attempts: task.attempts + 1
        })
        .eq('id', taskId)

      let result: string
      let error: any = null

      // Try CrewAI first for supported task types
      if (this.isCrewAITask(task.task_type)) {
        try {
          result = await this.processWithCrewAI(task)
        } catch (crewError) {
          console.warn('CrewAI processing failed, falling back to legacy processor:', crewError)
          // Fall back to legacy processor
          const { data, error: legacyError } = await supabase.functions.invoke('ai-agent-processor', {
            body: {
              taskType: task.task_type,
              payload: task.payload,
              churchId: task.church_id
            }
          })
          if (legacyError) throw legacyError
          result = data.result
        }
      } else {
        // Use legacy Edge Function for unsupported tasks
        const { data, error: legacyError } = await supabase.functions.invoke('ai-agent-processor', {
          body: {
            taskType: task.task_type,
            payload: task.payload,
            churchId: task.church_id
          }
        })
        if (legacyError) throw legacyError
        result = data.result
      }

      // Update task as completed
      await supabase
        .from('agent_tasks')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          result: result,
          last_error: null
        })
        .eq('id', taskId)

      return true
    } catch (error) {
      // Get task again for error handling since it might be out of scope
      const { data: taskForError } = await supabase
        .from('agent_tasks')
        .select('attempts, max_attempts')
        .eq('id', taskId)
        .single()

      const attempts = taskForError?.attempts || 0
      const maxAttempts = taskForError?.max_attempts || 3

      // Update task with error
      await supabase
        .from('agent_tasks')
        .update({
          status: attempts + 1 >= maxAttempts ? 'FAILED' : 'PENDING',
          last_error: error instanceof Error ? error.message : String(error),
          completed_at: attempts + 1 >= maxAttempts ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      console.error('Error processing task:', error)
      return false
    }
  }

  // Check if task type is supported by CrewAI
  private isCrewAITask(taskType: string): boolean {
    const crewAITasks = [
      'member_matching',
      'pastoral_care_reminder',
      'event_follow_up',
      'giving_analysis',
      'member_engagement',
      'communication_outreach'
    ]
    return crewAITasks.includes(taskType)
  }

  // Process task using CrewAI
  private async processWithCrewAI(task: AgentTask): Promise<string> {
    const context: ExecutionContext = {
      churchId: task.church_id!,
      userId: task.payload?.userId,
      triggerEvent: task.task_type,
      metadata: { taskId: task.id }
    }

    // Map legacy task types to CrewAI workflows
    switch (task.task_type) {
      case 'member_matching':
        return await crewaiOrchestrator.executeMemberEngagementWorkflow(
          task.payload.userId,
          context
        )
      
      case 'pastoral_care_reminder':
        return await crewaiOrchestrator.executePastoralCareWorkflow(
          task.payload.memberId,
          task.payload.reason || 'General pastoral care',
          context
        )
      
      case 'event_follow_up':
        return await crewaiOrchestrator.executeEventFollowUpWorkflow(
          task.payload.eventId,
          context
        )
      
      case 'giving_analysis':
        return await crewaiOrchestrator.executeGivingAnalysisWorkflow(
          'month',
          context
        )
      
      default:
        // Use generic agent execution
        return await crewaiOrchestrator.executeAgentTask(
          'general_assistant',
          `Process ${task.task_type} task with payload: ${JSON.stringify(task.payload)}`,
          context,
          task.payload
        )
    }
  }

  // Get pending tasks for processing
  async getPendingTasks(limit: number = 10): Promise<AgentTask[]> {
    try {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('status', 'PENDING')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error fetching pending tasks:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching pending tasks:', error)
      return []
    }
  }

  // Convenience methods for common agent tasks
  async scheduleMemberMatching(userId: string, churchId: string): Promise<AgentTask | null> {
    return this.queueTask({
      church_id: churchId,
      task_type: 'member_matching',
      payload: { userId },
      priority: 7
    })
  }

  async schedulePastoralCareReminder(memberId: string, reason: string, churchId: string): Promise<AgentTask | null> {
    return this.queueTask({
      church_id: churchId,
      task_type: 'pastoral_care_reminder',
      payload: { memberId, reason },
      priority: 8
    })
  }

  async scheduleEventFollowUp(eventId: string, churchId: string, delayHours: number = 24): Promise<AgentTask | null> {
    const scheduledAt = new Date()
    scheduledAt.setHours(scheduledAt.getHours() + delayHours)

    return this.queueTask({
      church_id: churchId,
      task_type: 'event_follow_up',
      payload: { eventId },
      priority: 6,
      scheduled_at: scheduledAt.toISOString()
    })
  }

  async scheduleGivingAnalysis(churchId: string): Promise<AgentTask | null> {
    return this.queueTask({
      church_id: churchId,
      task_type: 'giving_analysis',
      payload: {},
      priority: 4
    })
  }

  // Real-time task monitoring
  subscribeToTaskUpdates(churchId: string, callback: (task: AgentTask) => void) {
    return supabase
      .channel(`agent_tasks_${churchId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'agent_tasks',
          filter: `church_id=eq.${churchId}`
        },
        (payload) => {
          callback(payload.new as AgentTask)
        }
      )
      .subscribe()
  }
}

// Export singleton instance
export const aiAgentService = AIAgentService.getInstance()

// Hook for React components
import { useState, useEffect } from 'react'

export function useAIAgents(churchId?: string) {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!churchId) return

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_tasks')
          .select('*')
          .eq('church_id', churchId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!error && data) {
          setTasks(data)
        }
      } catch (error) {
        console.error('Error fetching agent tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    // Subscribe to real-time updates
    const subscription = aiAgentService.subscribeToTaskUpdates(churchId, (task) => {
      setTasks(prev => {
        const index = prev.findIndex(t => t.id === task.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = task
          return updated
        } else {
          return [task, ...prev]
        }
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [churchId])

  return { tasks, loading }
}
