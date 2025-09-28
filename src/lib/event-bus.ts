import { EventEmitter } from 'events'
import { supabase } from '@/lib/supabase'

export interface ChurchEvent {
  id: string
  type: string
  source: string
  data: any
  metadata?: any
  churchId: string
  userId?: string
  timestamp: Date
}

export interface EventHandler {
  (event: ChurchEvent): Promise<void> | void
}

export interface EventSubscription {
  id: string
  eventType: string
  handler: EventHandler
  once?: boolean
}

export class EventBus extends EventEmitter {
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private persistEvents: boolean
  private maxListeners: number

  constructor(options: {
    persistEvents?: boolean
    maxListeners?: number
  } = {}) {
    super()
    this.persistEvents = options.persistEvents ?? true
    this.maxListeners = options.maxListeners ?? 100
    this.setMaxListeners(this.maxListeners)
  }

  // Subscribe to events
  subscribe(eventType: string, handler: EventHandler, once = false): string {
    const subscription: EventSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      handler,
      once
    }

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }
    this.subscriptions.get(eventType)!.push(subscription)

    // Also register with EventEmitter for internal handling
    if (once) {
      this.once(eventType, handler)
    } else {
      this.on(eventType, handler)
    }

    return subscription.id
  }

  // Unsubscribe from events
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of Array.from(this.subscriptions.entries())) {
      const index = subscriptions.findIndex((sub: EventSubscription) => sub.id === subscriptionId)
      if (index !== -1) {
        const subscription = subscriptions[index]
        subscriptions.splice(index, 1)
        
        // Remove from EventEmitter
        this.removeListener(eventType, subscription.handler)
        
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType)
        }
        return true
      }
    }
    return false
  }

  // Publish an event
  async publish(event: Omit<ChurchEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: ChurchEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    try {
      // Persist event if enabled
      if (this.persistEvents) {
        await this.persistEvent(fullEvent)
      }

      // Emit to subscribers
      this.emit(event.type, fullEvent)

      // Handle specific event types
      await this.handleSystemEvents(fullEvent)

      return fullEvent.id
    } catch (error) {
      console.error('Failed to publish event:', error)
      throw error
    }
  }

  // Publish multiple events
  async publishBatch(events: Array<Omit<ChurchEvent, 'id' | 'timestamp'>>): Promise<string[]> {
    const eventIds: string[] = []
    
    for (const event of events) {
      try {
        const eventId = await this.publish(event)
        eventIds.push(eventId)
      } catch (error) {
        console.error('Failed to publish event in batch:', error)
        // Continue with other events
      }
    }
    
    return eventIds
  }

  // Persist event to database
  private async persistEvent(event: ChurchEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_logs')
        .insert({
          id: event.id,
          type: event.type,
          source: event.source,
          data: event.data,
          metadata: event.metadata,
          church_id: event.churchId,
          user_id: event.userId,
          timestamp: event.timestamp.toISOString()
        })
      
      if (error) {
        console.error('Failed to persist event:', error)
      }
    } catch (error) {
      console.error('Failed to persist event:', error)
      // Don't throw here to avoid breaking event flow
    }
  }

  // Handle system events that trigger workflows or other actions
  private async handleSystemEvents(event: ChurchEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'member.created':
          await this.handleNewMemberEvent(event)
          break
        case 'member.visited':
          await this.handleVisitorEvent(event)
          break
        case 'donation.received':
          await this.handleDonationEvent(event)
          break
        case 'member.absent':
          await this.handleAbsentMemberEvent(event)
          break
        case 'member.birthday':
          await this.handleBirthdayEvent(event)
          break
        case 'event.registered':
          await this.handleEventRegistrationEvent(event)
          break
        case 'volunteer.signup':
          await this.handleVolunteerSignupEvent(event)
          break
        case 'prayer.request':
          await this.handlePrayerRequestEvent(event)
          break
        case 'pastoral.care.needed':
          await this.handlePastoralCareEvent(event)
          break
      }
    } catch (error) {
      console.error('Failed to handle system event:', error)
    }
  }

  // Event handlers for specific event types
  private async handleNewMemberEvent(event: ChurchEvent): Promise<void> {
    // Trigger new member workflow
    await this.triggerWorkflow('NEW_MEMBER', event.data, event.churchId)
  }

  private async handleVisitorEvent(event: ChurchEvent): Promise<void> {
    // Trigger visitor follow-up workflow
    await this.triggerWorkflow('NEW_VISITOR', event.data, event.churchId)
  }

  private async handleDonationEvent(event: ChurchEvent): Promise<void> {
    // Trigger donation thank you workflow
    await this.triggerWorkflow('DONATION_RECEIVED', event.data, event.churchId)
  }

  private async handleAbsentMemberEvent(event: ChurchEvent): Promise<void> {
    // Trigger absent member follow-up workflow
    await this.triggerWorkflow('MEMBER_ABSENT', event.data, event.churchId)
  }

  private async handleBirthdayEvent(event: ChurchEvent): Promise<void> {
    // Trigger birthday workflow
    await this.triggerWorkflow('BIRTHDAY', event.data, event.churchId)
  }

  private async handleEventRegistrationEvent(event: ChurchEvent): Promise<void> {
    // Trigger event registration workflow
    await this.triggerWorkflow('EVENT_REGISTRATION', event.data, event.churchId)
  }

  private async handleVolunteerSignupEvent(event: ChurchEvent): Promise<void> {
    // Trigger volunteer signup workflow
    await this.triggerWorkflow('VOLUNTEER_SIGNUP', event.data, event.churchId)
  }

  private async handlePrayerRequestEvent(event: ChurchEvent): Promise<void> {
    // Create urgent pastoral care task
    await this.createUrgentTask({
      title: 'Prayer Request Received',
      description: `Prayer request: ${event.data.request}`,
      taskType: 'PRAYER_REQUEST',
      priority: 'HIGH',
      churchId: event.churchId,
      memberId: event.data.memberId,
      metadata: event.data
    })
  }

  private async handlePastoralCareEvent(event: ChurchEvent): Promise<void> {
    // Create pastoral care task
    await this.createUrgentTask({
      title: 'Pastoral Care Needed',
      description: `Pastoral care needed: ${event.data.reason}`,
      taskType: 'PASTORAL_CARE',
      priority: 'HIGH',
      churchId: event.churchId,
      memberId: event.data.memberId,
      metadata: event.data
    })
  }

  // Trigger workflow based on event
  private async triggerWorkflow(triggerType: string, data: any, churchId: string): Promise<void> {
    try {
      // Find active workflows for this trigger type
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select(`
          *,
          workflow_steps!inner(
            *
          )
        `)
        .eq('church_id', churchId)
        .eq('trigger_type', triggerType)
        .eq('is_active', true)
        .order('step_order', { foreignTable: 'workflow_steps', ascending: true })
      
      if (error) {
        console.error('Failed to fetch workflows:', error)
        return
      }

      // Process each matching workflow
      for (const workflow of workflows || []) {
        await this.processWorkflow(workflow, data)
      }
    } catch (error) {
      console.error('Failed to trigger workflow:', error)
    }
  }

  // Process a workflow
  private async processWorkflow(workflow: any, triggerData: any): Promise<void> {
    try {
      // Import job queue to schedule workflow processing
      const { getJobQueue, JOB_TYPES } = await import('./job-queue')
      const queue = getJobQueue()

      await queue.add(JOB_TYPES.PROCESS_WORKFLOW, {
        workflowId: workflow.id,
        triggerData
      }, {
        priority: 1
      })
    } catch (error) {
      console.error('Failed to process workflow:', error)
    }
  }

  // Create urgent task
  private async createUrgentTask(taskData: {
    title: string
    description: string
    taskType: string
    priority: string
    churchId: string
    memberId?: string
    metadata?: any
  }): Promise<void> {
    try {
      // Find appropriate staff member to assign task
      const assignee = await this.findTaskAssignee(taskData.taskType, taskData.churchId)

      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          task_type: taskData.taskType,
          priority: taskData.priority,
          church_id: taskData.churchId,
          member_id: taskData.memberId,
          metadata: taskData.metadata,
          assigned_to: assignee?.id || null,
          created_by: assignee?.id || null,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
      
      if (error) {
        console.error('Failed to create urgent task:', error)
      }
    } catch (error) {
      console.error('Failed to create urgent task:', error)
    }
  }

  // Find appropriate staff member for task assignment
  private async findTaskAssignee(taskType: string, churchId: string) {
    try {
      // This would be enhanced with proper role-based assignment
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('church_id', churchId)
        .limit(1)
        .single()
      
      if (error) {
        console.error('Failed to find task assignee:', error)
        return null
      }
      
      return user
    } catch (error) {
      console.error('Failed to find task assignee:', error)
      return null
    }
  }

  // Get event history
  async getEventHistory(filters: {
    churchId: string
    eventType?: string
    source?: string
    fromDate?: Date
    toDate?: Date
    limit?: number
    offset?: number
  }): Promise<ChurchEvent[]> {
    try {
      let query = supabase
        .from('event_logs')
        .select('*')
        .eq('church_id', filters.churchId)
        .order('timestamp', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100) - 1)
      
      if (filters.eventType) {
        query = query.eq('type', filters.eventType)
      }
      
      if (filters.source) {
        query = query.eq('source', filters.source)
      }
      
      if (filters.fromDate) {
        query = query.gte('timestamp', filters.fromDate.toISOString())
      }
      
      if (filters.toDate) {
        query = query.lte('timestamp', filters.toDate.toISOString())
      }

      const { data: events, error } = await query
      
      if (error) {
        console.error('Failed to get event history:', error)
        return []
      }

      return (events || []).map(event => ({
        ...event,
        churchId: event.church_id,
        userId: event.user_id,
        timestamp: new Date(event.timestamp)
      })) as ChurchEvent[]
    } catch (error) {
      console.error('Failed to get event history:', error)
      return []
    }
  }

  // Get event statistics
  async getEventStats(churchId: string, timeframe?: {
    fromDate: Date
    toDate: Date
  }): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySource: Record<string, number>
  }> {
    try {
      let baseQuery = supabase
        .from('event_logs')
        .select('type, source')
        .eq('church_id', churchId)
      
      if (timeframe) {
        baseQuery = baseQuery
          .gte('timestamp', timeframe.fromDate.toISOString())
          .lte('timestamp', timeframe.toDate.toISOString())
      }

      const { data: events, error } = await baseQuery
      
      if (error) {
        console.error('Failed to get event stats:', error)
        return {
          totalEvents: 0,
          eventsByType: {},
          eventsBySource: {}
        }
      }

      const totalEvents = events?.length || 0
      const eventsByType: Record<string, number> = {}
      const eventsBySource: Record<string, number> = {}
      
      events?.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
        eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1
      })

      return {
        totalEvents,
        eventsByType,
        eventsBySource
      }
    } catch (error) {
      console.error('Failed to get event stats:', error)
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySource: {}
      }
    }
  }

  // Clean up old events
  async cleanup(olderThan: Date): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('event_logs')
        .delete()
        .lt('timestamp', olderThan.toISOString())
        .select('id')
      
      if (error) {
        console.error('Failed to cleanup events:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Failed to cleanup events:', error)
      return 0
    }
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null

export function getEventBus(options?: {
  persistEvents?: boolean
  maxListeners?: number
}): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(options)
  }
  return eventBusInstance
}

// Event type constants
export const EVENT_TYPES = {
  // Member events
  MEMBER_CREATED: 'member.created',
  MEMBER_UPDATED: 'member.updated',
  MEMBER_VISITED: 'member.visited',
  MEMBER_ABSENT: 'member.absent',
  MEMBER_BIRTHDAY: 'member.birthday',
  MEMBER_ANNIVERSARY: 'member.anniversary',

  // Donation events
  DONATION_RECEIVED: 'donation.received',
  PLEDGE_CREATED: 'pledge.created',
  PLEDGE_FULFILLED: 'pledge.fulfilled',

  // Event events
  EVENT_CREATED: 'event.created',
  EVENT_REGISTERED: 'event.registered',
  EVENT_CANCELLED: 'event.cancelled',

  // Communication events
  EMAIL_SENT: 'email.sent',
  EMAIL_RECEIVED: 'email.received',
  SMS_SENT: 'sms.sent',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',
  TASK_OVERDUE: 'task.overdue',

  // Pastoral care events
  PRAYER_REQUEST: 'prayer.request',
  PASTORAL_CARE_NEEDED: 'pastoral.care.needed',
  VISIT_SCHEDULED: 'visit.scheduled',

  // Volunteer events
  VOLUNTEER_SIGNUP: 'volunteer.signup',
  VOLUNTEER_ASSIGNED: 'volunteer.assigned',

  // System events
  WORKFLOW_TRIGGERED: 'workflow.triggered',
  AGENT_STARTED: 'agent.started',
  AGENT_COMPLETED: 'agent.completed'
} as const

// Helper functions for common events
export async function publishMemberEvent(
  type: string,
  memberId: string,
  churchId: string,
  data: any = {},
  userId?: string
): Promise<string> {
  const eventBus = getEventBus()
  
  return await eventBus.publish({
    type,
    source: 'member_management',
    data: { memberId, ...data },
    churchId,
    userId
  })
}

export async function publishDonationEvent(
  donationId: string,
  amount: number,
  churchId: string,
  memberId?: string,
  userId?: string
): Promise<string> {
  const eventBus = getEventBus()
  
  return await eventBus.publish({
    type: EVENT_TYPES.DONATION_RECEIVED,
    source: 'giving_system',
    data: { donationId, amount, memberId },
    churchId,
    userId
  })
}

export async function publishTaskEvent(
  type: string,
  taskId: string,
  churchId: string,
  data: any = {},
  userId?: string
): Promise<string> {
  const eventBus = getEventBus()
  
  return await eventBus.publish({
    type,
    source: 'task_management',
    data: { taskId, ...data },
    churchId,
    userId
  })
}

export async function publishPrayerRequest(
  request: string,
  memberId: string,
  churchId: string,
  urgent = false,
  userId?: string
): Promise<string> {
  const eventBus = getEventBus()
  
  return await eventBus.publish({
    type: EVENT_TYPES.PRAYER_REQUEST,
    source: 'pastoral_care',
    data: { request, memberId, urgent },
    churchId,
    userId
  })
}
