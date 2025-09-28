import { getEventBus, ChurchEvent, EventHandler } from './event-bus'
import { getJobQueue, JOB_TYPES } from './job-queue'
import { supabase } from './supabase'

export interface AgentEventSubscription {
  id: string
  agentType: string
  eventTypes: string[]
  conditions?: {
    source?: string[]
    metadata?: Record<string, any>
    priority?: 'low' | 'medium' | 'high'
  }
  handler: AgentEventHandler
  isActive: boolean
}

export interface AgentEventHandler {
  (event: ChurchEvent, agentContext: AgentEventContext): Promise<void>
}

export interface AgentEventContext {
  churchId: string
  agentType: string
  subscriptionId: string
  sessionId: string
}

export class AgentEventSubscriber {
  private eventBus = getEventBus()
  private jobQueue = getJobQueue()
  private subscriptions: Map<string, AgentEventSubscription> = new Map()
  private activeHandlers: Map<string, string> = new Map() // subscriptionId -> eventBusSubscriptionId

  constructor() {
    this.initializeAgentSubscriptions()
  }

  // Initialize default agent subscriptions
  private async initializeAgentSubscriptions(): Promise<void> {
    // Meeting Organizer Agent subscriptions
    await this.subscribeAgent('MeetingOrganizer', [
      'event.created',
      'event.registered',
      'volunteer.signup',
      'member.created'
    ], this.handleMeetingOrganizerEvents.bind(this))

    // Email Processing Agent subscriptions
    await this.subscribeAgent('EmailProcessor', [
      'email.received',
      'communication.sent',
      'member.created',
      'donation.received'
    ], this.handleEmailProcessorEvents.bind(this))

    // Follow-up Agent subscriptions
    await this.subscribeAgent('FollowUpAgent', [
      'member.absent',
      'member.visited',
      'donation.received',
      'event.registered',
      'task.overdue',
      'engagement.low'
    ], this.handleFollowUpEvents.bind(this))

    // Pastoral Care Agent subscriptions
    await this.subscribeAgent('PastoralCareAgent', [
      'pastoral.prayer_request',
      'pastoral.care_needed',
      'member.absent',
      'engagement.low',
      'task.overdue'
    ], this.handlePastoralCareEvents.bind(this), {
      priority: 'high'
    })

    // Content Generation Agent subscriptions
    await this.subscribeAgent('ContentGenerator', [
      'event.created',
      'member.birthday',
      'donation.received',
      'communication.scheduled'
    ], this.handleContentGenerationEvents.bind(this))
  }

  // Subscribe an agent to specific event types
  async subscribeAgent(
    agentType: string,
    eventTypes: string[],
    handler: AgentEventHandler,
    conditions?: AgentEventSubscription['conditions']
  ): Promise<string> {
    const subscriptionId = `agent_${agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: AgentEventSubscription = {
      id: subscriptionId,
      agentType,
      eventTypes,
      conditions,
      handler,
      isActive: true
    }

    this.subscriptions.set(subscriptionId, subscription)

    // Subscribe to each event type in the event bus
    const eventBusSubscriptions: string[] = []
    for (const eventType of eventTypes) {
      const eventBusSubId = this.eventBus.subscribe(
        eventType,
        this.createEventHandler(subscription)
      )
      eventBusSubscriptions.push(eventBusSubId)
    }

    // Store the event bus subscription IDs for cleanup
    this.activeHandlers.set(subscriptionId, eventBusSubscriptions.join(','))

    console.log(`Agent ${agentType} subscribed to events: ${eventTypes.join(', ')}`)
    return subscriptionId
  }

  // Create event handler wrapper for agent subscriptions
  private createEventHandler(subscription: AgentEventSubscription): EventHandler {
    return async (event: ChurchEvent) => {
      try {
        // Check if subscription is still active
        if (!subscription.isActive) return

        // Apply conditions filter
        if (!this.matchesConditions(event, subscription.conditions)) return

        // Create agent context
        const agentContext: AgentEventContext = {
          churchId: event.churchId,
          agentType: subscription.agentType,
          subscriptionId: subscription.id,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        // Log agent event processing
        await this.logAgentEventProcessing(event, subscription, agentContext)

        // Execute agent handler
        await subscription.handler(event, agentContext)

      } catch (error) {
        console.error(`Agent ${subscription.agentType} failed to handle event ${event.type}:`, error)
        
        // Log error for monitoring
        await this.logAgentError(event, subscription, error)
      }
    }
  }

  // Check if event matches subscription conditions
  private matchesConditions(
    event: ChurchEvent, 
    conditions?: AgentEventSubscription['conditions']
  ): boolean {
    if (!conditions) return true

    // Check source filter
    if (conditions.source && !conditions.source.includes(event.source)) {
      return false
    }

    // Check metadata conditions
    if (conditions.metadata) {
      for (const [key, value] of Object.entries(conditions.metadata)) {
        if (event.metadata?.[key] !== value) {
          return false
        }
      }
    }

    // Check priority filter
    if (conditions.priority && event.metadata?.priority !== conditions.priority) {
      return false
    }

    return true
  }

  // Agent-specific event handlers
  private async handleMeetingOrganizerEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'event.created':
        await this.scheduleEventReminders(event, context)
        break
      case 'event.registered':
        await this.sendRegistrationConfirmation(event, context)
        break
      case 'volunteer.signup':
        await this.assignVolunteerTasks(event, context)
        break
      case 'member.created':
        await this.scheduleNewMemberOrientation(event, context)
        break
    }
  }

  private async assignVolunteerTasks(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Create volunteer task assignment
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'MeetingOrganizer',
      taskType: 'assign_volunteer_tasks',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async scheduleNewMemberOrientation(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Schedule new member orientation
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'MeetingOrganizer',
      taskType: 'schedule_orientation',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async handleEmailProcessorEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'email.received':
        await this.processIncomingEmail(event, context)
        break
      case 'member.created':
        await this.sendWelcomeEmail(event, context)
        break
      case 'donation.received':
        await this.sendDonationThankYou(event, context)
        break
    }
  }

  private async sendWelcomeEmail(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Send welcome email to new member
    await this.jobQueue.add(JOB_TYPES.SEND_EMAIL, {
      agentType: 'EmailProcessor',
      taskType: 'welcome_email',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async sendDonationThankYou(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Send donation thank you email
    await this.jobQueue.add(JOB_TYPES.SEND_EMAIL, {
      agentType: 'EmailProcessor',
      taskType: 'donation_thank_you',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async handleFollowUpEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'member.absent':
        await this.scheduleAbsentMemberFollowUp(event, context)
        break
    }
  }

  private async handleFollowUpAgentEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'member.visited':
        await this.scheduleVisitorFollowUp(event, context)
        break
      case 'donation.received':
        await this.scheduleThankYouFollowUp(event, context)
        break
      case 'task.overdue':
        await this.escalateOverdueTask(event, context)
        break
    }
  }

  private async scheduleVisitorFollowUp(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Schedule visitor follow-up task
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'FollowUpAgent',
      taskType: 'visitor_follow_up',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async scheduleThankYouFollowUp(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Schedule thank you follow-up
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'FollowUpAgent',
      taskType: 'thank_you_follow_up',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async escalateOverdueTask(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Escalate overdue task
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'FollowUpAgent',
      taskType: 'escalate_task',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async handlePastoralCareEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'pastoral.prayer_request':
        await this.createPrayerRequestTask(event, context)
        break
      case 'pastoral.care_needed':
        await this.createPastoralCareTask(event, context)
        break
      case 'member.absent':
        await this.createWellbeingCheckTask(event, context)
        break
    }
  }

  private async createPrayerRequestTask(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Create prayer request task
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'PastoralCareAgent',
      taskType: 'prayer_request',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async createPastoralCareTask(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Create pastoral care task
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'PastoralCareAgent',
      taskType: 'pastoral_care',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async createWellbeingCheckTask(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Create wellbeing check task
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'PastoralCareAgent',
      taskType: 'wellbeing_check',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async handleContentGenerationEvents(
    event: ChurchEvent, 
    context: AgentEventContext
  ): Promise<void> {
    switch (event.type) {
      case 'event.created':
        await this.generateEventPromotion(event, context)
        break
      case 'member.birthday':
        await this.generateBirthdayMessage(event, context)
        break
      case 'donation.received':
        await this.generateThankYouContent(event, context)
        break
    }
  }

  private async generateEventPromotion(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Generate event promotion content
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'ContentGenerator',
      taskType: 'event_promotion',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async generateBirthdayMessage(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Generate birthday message
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'ContentGenerator',
      taskType: 'birthday_message',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async generateThankYouContent(
    event: ChurchEvent,
    context: AgentEventContext
  ): Promise<void> {
    // Generate thank you content
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'ContentGenerator',
      taskType: 'thank_you_content',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  // Implementation methods for agent actions
  private async scheduleEventReminders(event: ChurchEvent, context: AgentEventContext): Promise<void> {
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'MeetingOrganizer',
      taskType: 'event_reminder',
      eventData: event.data,
      churchId: context.churchId,
      scheduleFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours before
    })
  }

  private async sendRegistrationConfirmation(event: ChurchEvent, context: AgentEventContext): Promise<void> {
    await this.jobQueue.add(JOB_TYPES.SEND_EMAIL, {
      to: event.data.memberEmail,
      template: 'event_registration_confirmation',
      data: {
        eventName: event.data.eventName,
        eventDate: event.data.eventDate,
        memberName: event.data.memberName
      },
      churchId: context.churchId
    })
  }

  private async processIncomingEmail(event: ChurchEvent, context: AgentEventContext): Promise<void> {
    // Use AI to categorize and route the email
    await this.jobQueue.add(JOB_TYPES.AGENT_TASK, {
      agentType: 'EmailProcessor',
      taskType: 'process_email',
      eventData: event.data,
      churchId: context.churchId
    })
  }

  private async scheduleAbsentMemberFollowUp(event: ChurchEvent, context: AgentEventContext): Promise<void> {
    // Create a follow-up task for pastoral team
    await supabase.from('tasks').insert({
      title: 'Follow up with absent member',
      description: `${event.data.memberName} has been absent for ${event.data.weeksAbsent} weeks`,
      task_type: 'MEMBER_FOLLOW_UP',
      priority: event.data.weeksAbsent > 4 ? 'high' : 'medium',
      church_id: context.churchId,
      member_id: event.data.memberId,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      status: 'pending',
      metadata: {
        agentGenerated: true,
        eventId: event.id,
        weeksAbsent: event.data.weeksAbsent
      }
    })
  }


  // Logging and monitoring
  private async logAgentEventProcessing(
    event: ChurchEvent, 
    subscription: AgentEventSubscription, 
    context: AgentEventContext
  ): Promise<void> {
    try {
      await supabase.from('agent_event_logs').insert({
        agent_type: subscription.agentType,
        event_id: event.id,
        event_type: event.type,
        church_id: context.churchId,
        session_id: context.sessionId,
        subscription_id: subscription.id,
        status: 'processing',
        processed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log agent event processing:', error)
    }
  }

  private async logAgentError(
    event: ChurchEvent, 
    subscription: AgentEventSubscription, 
    error: any
  ): Promise<void> {
    try {
      await supabase.from('agent_event_logs').insert({
        agent_type: subscription.agentType,
        event_id: event.id,
        event_type: event.type,
        church_id: event.churchId,
        subscription_id: subscription.id,
        status: 'error',
        error_message: error instanceof Error ? error.message : String(error),
        processed_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Failed to log agent error:', logError)
    }
  }

  // Management methods
  async unsubscribeAgent(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    // Remove from event bus
    const eventBusSubIds = this.activeHandlers.get(subscriptionId)
    if (eventBusSubIds) {
      eventBusSubIds.split(',').forEach(subId => {
        this.eventBus.unsubscribe(subId)
      })
      this.activeHandlers.delete(subscriptionId)
    }

    // Remove from local subscriptions
    this.subscriptions.delete(subscriptionId)
    
    console.log(`Agent ${subscription.agentType} unsubscribed from events`)
    return true
  }

  async pauseAgentSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    subscription.isActive = false
    return true
  }

  async resumeAgentSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    subscription.isActive = true
    return true
  }

  // Get subscription status
  getActiveSubscriptions(): AgentEventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive)
  }

  getAgentSubscriptions(agentType: string): AgentEventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.agentType === agentType && sub.isActive
    )
  }
}

// Singleton instance
let agentEventSubscriber: AgentEventSubscriber | null = null

export function getAgentEventSubscriber(): AgentEventSubscriber {
  if (!agentEventSubscriber) {
    agentEventSubscriber = new AgentEventSubscriber()
  }
  return agentEventSubscriber
}

// Initialize agent event subscriptions on module load
getAgentEventSubscriber()
