import { createClient } from '@supabase/supabase-js'
import { eventBus } from './events'
import { getJobQueue } from './job-queue'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface CRMTask {
  id: string
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  status: TaskStatus
  assignedTo: string
  memberId?: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export enum TaskType {
  FOLLOW_UP = 'FOLLOW_UP',
  VISIT = 'VISIT',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  PRAYER_REQUEST = 'PRAYER_REQUEST',
  PASTORAL_CARE = 'PASTORAL_CARE',
  ADMINISTRATIVE = 'ADMINISTRATIVE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface MemberInteraction {
  id: string
  memberId: string
  interactionType: InteractionType
  notes: string
  date: Date
  userId: string
  followUpRequired: boolean
  followUpDate?: Date
}

export enum InteractionType {
  PHONE_CALL = 'PHONE_CALL',
  EMAIL = 'EMAIL',
  IN_PERSON = 'IN_PERSON',
  TEXT_MESSAGE = 'TEXT_MESSAGE',
  PASTORAL_VISIT = 'PASTORAL_VISIT',
  COUNSELING = 'COUNSELING',
  PRAYER = 'PRAYER'
}

export class CRMSystem {
  private jobQueue = getJobQueue()

  // Task Management
  async createTask(task: Omit<CRMTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMTask> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        task_type: task.taskType,
        priority: task.priority,
        status: task.status,
        assigned_to: task.assignedTo,
        member_id: task.memberId,
        due_date: task.dueDate?.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return this.mapTaskFromDb(data)
  }

  async updateTask(id: string, updates: Partial<CRMTask>): Promise<CRMTask> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        task_type: updates.taskType,
        priority: updates.priority,
        status: updates.status,
        assigned_to: updates.assignedTo,
        member_id: updates.memberId,
        due_date: updates.dueDate?.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return this.mapTaskFromDb(data)
  }

  async getTasks(filters: {
    assignedTo?: string
    memberId?: string
    status?: TaskStatus
    priority?: TaskPriority
    dueDate?: Date
  } = {}): Promise<CRMTask[]> {
    let query = supabase.from('tasks').select('*')

    if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
    if (filters.memberId) query = query.eq('member_id', filters.memberId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.dueDate) query = query.lte('due_date', filters.dueDate.toISOString())

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(this.mapTaskFromDb)
  }

  // Member Interaction Management
  async recordInteraction(interaction: Omit<MemberInteraction, 'id'>): Promise<MemberInteraction> {
    const { data, error } = await supabase
      .from('member_interactions')
      .insert({
        member_id: interaction.memberId,
        interaction_type: interaction.interactionType,
        notes: interaction.notes,
        date: interaction.date.toISOString(),
        user_id: interaction.userId,
        follow_up_required: interaction.followUpRequired,
        follow_up_date: interaction.followUpDate?.toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Create follow-up task if required
    if (interaction.followUpRequired && interaction.followUpDate) {
      await this.createTask({
        title: `Follow up with member`,
        description: `Follow up regarding: ${interaction.notes}`,
        taskType: TaskType.FOLLOW_UP,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        assignedTo: interaction.userId,
        memberId: interaction.memberId,
        dueDate: interaction.followUpDate
      })
    }

    return this.mapInteractionFromDb(data)
  }

  async getInteractionHistory(memberId: string): Promise<MemberInteraction[]> {
    const { data, error } = await supabase
      .from('member_interactions')
      .select('*')
      .eq('member_id', memberId)
      .order('date', { ascending: false })

    if (error) throw error

    return (data || []).map(this.mapInteractionFromDb)
  }

  // Analytics and Reporting
  async getTaskStats(): Promise<{
    total: number
    pending: number
    inProgress: number
    completed: number
    overdue: number
  }> {
    const now = new Date().toISOString()
    
    const [totalResult, pendingResult, inProgressResult, completedResult, overdueResult] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'PENDING').lt('due_date', now)
    ])

    return {
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      inProgress: inProgressResult.count || 0,
      completed: completedResult.count || 0,
      overdue: overdueResult.count || 0
    }
  }

  async getMemberEngagementStats(memberId: string): Promise<{
    totalInteractions: number
    lastInteraction?: Date
    interactionsByType: Record<InteractionType, number>
    pendingTasks: number
  }> {
    const [interactionsResult, tasksResult] = await Promise.all([
      supabase.from('member_interactions').select('*').eq('member_id', memberId),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('member_id', memberId).eq('status', 'PENDING')
    ])

    const interactions = interactionsResult.data || []
    const interactionsByType = interactions.reduce((acc: any, interaction: any) => {
      acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
      return acc
    }, {})

    const lastInteraction = interactions.length > 0 
      ? new Date(Math.max(...interactions.map(i => new Date(i.date).getTime())))
      : undefined

    return {
      totalInteractions: interactions.length,
      lastInteraction,
      interactionsByType,
      pendingTasks: tasksResult.count || 0
    }
  }

  // Helper methods
  private mapTaskFromDb(data: any): CRMTask {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      taskType: data.task_type,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assigned_to,
      memberId: data.member_id,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private mapInteractionFromDb(data: any): MemberInteraction {
    return {
      id: data.id,
      memberId: data.member_id,
      interactionType: data.interaction_type,
      notes: data.notes,
      date: new Date(data.date),
      userId: data.user_id,
      followUpRequired: data.follow_up_required,
      followUpDate: data.follow_up_date ? new Date(data.follow_up_date) : undefined
    }
  }
}

// Export singleton instance
export const crmSystem = new CRMSystem()
