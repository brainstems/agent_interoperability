import { getEventBus, EVENT_TYPES, ChurchEvent } from './event-bus'
import { supabase } from './supabase'

export interface CRMEventData {
  entityId: string
  entityType: 'member' | 'donation' | 'event' | 'group' | 'task' | 'communication'
  action: 'created' | 'updated' | 'deleted' | 'registered' | 'completed' | 'sent' | 'received'
  data: any
  metadata?: any
}

export class CRMEventPublisher {
  private eventBus = getEventBus()

  // Member-related events
  async publishMemberEvent(
    action: 'created' | 'updated' | 'visited' | 'absent',
    memberId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    const eventType = `member.${action}`
    
    return await this.eventBus.publish({
      type: eventType,
      source: 'crm.members',
      data: {
        memberId,
        ...data
      },
      metadata: {
        triggeredBy: 'crm_operation',
        timestamp: new Date().toISOString()
      },
      churchId,
      userId
    })
  }

  // Donation-related events
  async publishDonationEvent(
    action: 'created' | 'updated' | 'processed',
    donationId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    const eventType = `donation.${action === 'created' ? 'received' : action}`
    
    return await this.eventBus.publish({
      type: eventType,
      source: 'crm.donations',
      data: {
        donationId,
        amount: data.amount,
        fundId: data.fundId,
        memberId: data.memberId,
        ...data
      },
      metadata: {
        triggeredBy: 'crm_operation'
      },
      churchId,
      userId
    })
  }

  // Event registration events
  async publishEventRegistrationEvent(
    eventId: string,
    memberId: string,
    churchId: string,
    registrationData: any = {},
    userId?: string
  ): Promise<string> {
    return await this.eventBus.publish({
      type: EVENT_TYPES.EVENT_REGISTERED,
      source: 'crm.events',
      data: {
        eventId,
        memberId,
        registrationDate: new Date().toISOString(),
        ...registrationData
      },
      metadata: {
        triggeredBy: 'event_registration'
      },
      churchId,
      userId
    })
  }

  // Event creation events
  async publishEventCreated(
    eventId: string,
    churchId: string,
    eventData: any = {},
    userId?: string
  ): Promise<string> {
    return await this.eventBus.publish({
      type: 'event.created',
      source: 'crm.events',
      data: {
        eventId,
        title: eventData.title,
        description: eventData.description,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        location: eventData.location,
        eventType: eventData.eventType,
        registrationRequired: eventData.registrationRequired,
        maxAttendees: eventData.maxAttendees,
        ...eventData
      },
      metadata: {
        triggeredBy: 'event_creation'
      },
      churchId,
      userId
    })
  }

  // Communication events
  async publishCommunicationEvent(
    action: 'sent' | 'received' | 'opened' | 'clicked',
    communicationId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    const eventType = `communication.${action}`
    
    return await this.eventBus.publish({
      type: eventType,
      source: 'crm.communications',
      data: {
        communicationId,
        channel: data.channel, // email, sms, etc.
        recipientId: data.recipientId,
        ...data
      },
      metadata: {
        triggeredBy: 'communication_tracking'
      },
      churchId,
      userId
    })
  }

  // Engagement tracking events
  async publishEngagementEvent(
    engagementType: 'website_visit' | 'email_open' | 'email_click' | 'form_submission' | 'attendance',
    memberId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    return await this.eventBus.publish({
      type: `engagement.${engagementType}`,
      source: 'crm.engagement',
      data: {
        memberId,
        engagementType,
        timestamp: new Date().toISOString(),
        ...data
      },
      metadata: {
        triggeredBy: 'engagement_tracking',
        score: this.calculateEngagementScore(engagementType, data)
      },
      churchId,
      userId
    })
  }

  // Task-related events
  async publishTaskEvent(
    action: 'created' | 'assigned' | 'completed' | 'overdue',
    taskId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    const eventType = `task.${action}`
    
    return await this.eventBus.publish({
      type: eventType,
      source: 'crm.tasks',
      data: {
        taskId,
        taskType: data.taskType,
        assignedTo: data.assignedTo,
        memberId: data.memberId,
        ...data
      },
      metadata: {
        triggeredBy: 'task_management'
      },
      churchId,
      userId
    })
  }

  // Pastoral care events
  async publishPastoralCareEvent(
    eventType: 'prayer_request' | 'care_needed' | 'visit_scheduled' | 'visit_completed',
    memberId: string,
    churchId: string,
    data: any = {},
    userId?: string
  ): Promise<string> {
    return await this.eventBus.publish({
      type: `pastoral.${eventType}`,
      source: 'crm.pastoral_care',
      data: {
        memberId,
        reason: data.reason,
        priority: data.priority || 'medium',
        notes: data.notes,
        ...data
      },
      metadata: {
        triggeredBy: 'pastoral_care_system',
        urgency: data.priority === 'high' ? 'urgent' : 'normal'
      },
      churchId,
      userId
    })
  }

  // Batch event publishing for bulk operations
  async publishBatchEvents(events: Array<Omit<ChurchEvent, 'id' | 'timestamp'>>): Promise<string[]> {
    return await this.eventBus.publishBatch(events)
  }

  // Calculate engagement score based on activity type
  private calculateEngagementScore(engagementType: string, data: any): number {
    const scores = {
      'website_visit': 1,
      'email_open': 2,
      'email_click': 5,
      'form_submission': 10,
      'attendance': 15
    }
    
    const baseScore = scores[engagementType as keyof typeof scores] || 1
    
    // Apply multipliers based on recency and frequency
    const recencyMultiplier = this.getRecencyMultiplier(data.timestamp)
    const frequencyMultiplier = data.frequency || 1
    
    return Math.round(baseScore * recencyMultiplier * frequencyMultiplier)
  }

  private getRecencyMultiplier(timestamp?: string): number {
    if (!timestamp) return 1
    
    const now = new Date()
    const eventTime = new Date(timestamp)
    const hoursDiff = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60)
    
    // More recent events get higher scores
    if (hoursDiff < 1) return 2.0
    if (hoursDiff < 24) return 1.5
    if (hoursDiff < 168) return 1.2 // 1 week
    return 1.0
  }

  // Track member engagement patterns
  async trackMemberEngagement(memberId: string, churchId: string): Promise<void> {
    try {
      // Get recent engagement events for this member
      const recentEvents = await this.eventBus.getEventHistory({
        churchId,
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
        limit: 100
      })

      const memberEvents = recentEvents.filter(event => 
        event.data?.memberId === memberId && 
        event.type.startsWith('engagement.')
      )

      // Calculate engagement trends
      const engagementScore = memberEvents.reduce((total, event) => 
        total + (event.metadata?.score || 1), 0
      )

      // Detect patterns and trigger appropriate events
      if (memberEvents.length === 0) {
        // No recent engagement - trigger re-engagement workflow
        await this.publishPastoralCareEvent(
          'care_needed',
          memberId,
          churchId,
          {
            reason: 'Low engagement detected',
            priority: 'medium',
            notes: 'Member has not engaged in the last 30 days'
          }
        )
      } else if (engagementScore > 50) {
        // High engagement - potential volunteer candidate
        await this.publishMemberEvent(
          'updated',
          memberId,
          churchId,
          {
            engagementLevel: 'high',
            volunteerCandidate: true,
            engagementScore
          }
        )
      }
    } catch (error) {
      console.error('Failed to track member engagement:', error)
    }
  }
}

// Singleton instance
let crmEventPublisher: CRMEventPublisher | null = null

export function getCRMEventPublisher(): CRMEventPublisher {
  if (!crmEventPublisher) {
    crmEventPublisher = new CRMEventPublisher()
  }
  return crmEventPublisher
}

// Helper functions for common CRM operations
export async function publishMemberCreated(memberId: string, churchId: string, memberData: any, userId?: string) {
  const publisher = getCRMEventPublisher()
  return await publisher.publishMemberEvent('created', memberId, churchId, memberData, userId)
}

export async function publishDonationReceived(donationId: string, churchId: string, donationData: any, userId?: string) {
  const publisher = getCRMEventPublisher()
  return await publisher.publishDonationEvent('created', donationId, churchId, donationData, userId)
}

export async function publishEventRegistration(eventId: string, memberId: string, churchId: string, registrationData: any, userId?: string) {
  const publisher = getCRMEventPublisher()
  return await publisher.publishEventRegistrationEvent(eventId, memberId, churchId, registrationData, userId)
}

export async function publishEventCreated(eventId: string, churchId: string, eventData: any, userId?: string) {
  const publisher = getCRMEventPublisher()
  return await publisher.publishEventCreated(eventId, churchId, eventData, userId)
}

// Re-export engagement tracking functions
export { trackEventRegistration, trackMemberRegistration, trackDonationSubmission } from './engagement-tracker'
