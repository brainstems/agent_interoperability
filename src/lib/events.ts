import { EventEmitter } from 'events'

// Event types for the church management system
export enum ChurchEventType {
  // Member events
  MEMBER_CREATED = 'member.created',
  MEMBER_UPDATED = 'member.updated',
  MEMBER_DELETED = 'member.deleted',
  MEMBER_STATUS_CHANGED = 'member.status_changed',

  // Group events
  GROUP_CREATED = 'group.created',
  GROUP_UPDATED = 'group.updated',
  GROUP_DELETED = 'group.deleted',
  GROUP_MEMBER_ADDED = 'group.member_added',
  GROUP_MEMBER_REMOVED = 'group.member_removed',

  // Event management events
  EVENT_CREATED = 'event.created',
  EVENT_UPDATED = 'event.updated',
  EVENT_DELETED = 'event.deleted',
  EVENT_REGISTRATION = 'event.registration',
  EVENT_UNREGISTRATION = 'event.unregistration',

  // Donation events
  DONATION_RECEIVED = 'donation.received',
  DONATION_UPDATED = 'donation.updated',
  DONATION_DELETED = 'donation.deleted',

  // Communication events
  COMMUNICATION_SENT = 'communication.sent',
  COMMUNICATION_DELIVERED = 'communication.delivered',
  COMMUNICATION_READ = 'communication.read',
  COMMUNICATION_FAILED = 'communication.failed',

  // Check-in events
  MEMBER_CHECKED_IN = 'checkin.member_checked_in',
  MEMBER_CHECKED_OUT = 'checkin.member_checked_out',

  // System events
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  BACKUP_COMPLETED = 'system.backup_completed',
  SYSTEM_ERROR = 'system.error'
}

export interface ChurchEvent {
  id: string
  type: ChurchEventType
  churchId: string
  userId?: string
  data: any
  timestamp: Date
  source: string
}

class ChurchEventBus extends EventEmitter {
  private static instance: ChurchEventBus

  static getInstance(): ChurchEventBus {
    if (!ChurchEventBus.instance) {
      ChurchEventBus.instance = new ChurchEventBus()
    }
    return ChurchEventBus.instance
  }

  emit(eventType: ChurchEventType, event: Omit<ChurchEvent, 'id' | 'timestamp'>): boolean {
    const fullEvent: ChurchEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    // Log the event for debugging
    console.log(`[EventBus] Emitting event: ${eventType}`, fullEvent)

    // Emit to all listeners
    return super.emit(eventType, fullEvent)
  }

  // Type-safe event listeners
  onMemberCreated(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.MEMBER_CREATED, listener)
  }

  onMemberUpdated(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.MEMBER_UPDATED, listener)
  }

  onMemberDeleted(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.MEMBER_DELETED, listener)
  }

  onGroupCreated(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.GROUP_CREATED, listener)
  }

  onGroupMemberAdded(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.GROUP_MEMBER_ADDED, listener)
  }

  onEventCreated(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.EVENT_CREATED, listener)
  }

  onDonationReceived(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.DONATION_RECEIVED, listener)
  }

  onCommunicationSent(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.COMMUNICATION_SENT, listener)
  }

  onMemberCheckedIn(listener: (event: ChurchEvent) => void): this {
    return this.on(ChurchEventType.MEMBER_CHECKED_IN, listener)
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const eventBus = ChurchEventBus.getInstance()

// Event handlers for automated workflows
export class ChurchEventHandlers {
  static init() {
    const bus = eventBus

    // Member lifecycle events
    bus.onMemberCreated((event) => {
      console.log(`New member created: ${event.data.firstName} ${event.data.lastName}`)
      // Could trigger welcome email, assign to default groups, etc.
    })

    bus.onMemberUpdated((event) => {
      console.log(`Member updated: ${event.data.id}`)
      // Could trigger profile sync, notification to leaders, etc.
    })

    // Group management events
    bus.onGroupMemberAdded((event) => {
      console.log(`Member added to group: ${event.data.memberId} -> ${event.data.groupId}`)
      // Could trigger welcome message to group, leader notification, etc.
    })

    // Donation events
    bus.onDonationReceived((event) => {
      console.log(`Donation received: $${event.data.amount} from ${event.data.memberId}`)
      // Could trigger thank you message, tax receipt generation, etc.
    })

    // Event registration events
    bus.on(ChurchEventType.EVENT_REGISTRATION, (event) => {
      console.log(`Event registration: ${event.data.memberId} -> ${event.data.eventId}`)
      // Could trigger confirmation email, add to calendar, etc.
    })

    // Communication events
    bus.onCommunicationSent((event) => {
      console.log(`Communication sent: ${event.data.subject} to ${event.data.recipientCount} recipients`)
      // Could trigger delivery tracking, analytics, etc.
    })

    // Check-in events
    bus.onMemberCheckedIn((event) => {
      console.log(`Member checked in: ${event.data.memberId} at ${event.data.eventId}`)
      // Could trigger attendance tracking, parent notifications for children, etc.
    })

    // System events
    bus.on(ChurchEventType.SYSTEM_ERROR, (event) => {
      console.error(`System error: ${event.data.error}`)
      // Could trigger admin notifications, error logging, etc.
    })
  }
}

// Helper functions for common event patterns
export class EventHelpers {
  static emitMemberEvent(type: ChurchEventType, churchId: string, userId: string, memberData: any, source = 'api') {
    eventBus.emit(type, {
      type,
      churchId,
      userId,
      data: memberData,
      source
    })
  }

  static emitGroupEvent(type: ChurchEventType, churchId: string, userId: string, groupData: any, source = 'api') {
    eventBus.emit(type, {
      type,
      churchId,
      userId,
      data: groupData,
      source
    })
  }

  static emitDonationEvent(churchId: string, userId: string, donationData: any, source = 'api') {
    eventBus.emit(ChurchEventType.DONATION_RECEIVED, {
      type: ChurchEventType.DONATION_RECEIVED,
      churchId,
      userId,
      data: donationData,
      source
    })
  }

  static emitCheckInEvent(churchId: string, userId: string, checkInData: any, source = 'api') {
    eventBus.emit(ChurchEventType.MEMBER_CHECKED_IN, {
      type: ChurchEventType.MEMBER_CHECKED_IN,
      churchId,
      userId,
      data: checkInData,
      source
    })
  }

  static emitSystemError(error: Error, context: any = {}, source = 'system') {
    eventBus.emit(ChurchEventType.SYSTEM_ERROR, {
      type: ChurchEventType.SYSTEM_ERROR,
      churchId: context.churchId || 'system',
      userId: context.userId,
      data: {
        error: error.message,
        stack: error.stack,
        context
      },
      source
    })
  }
}
