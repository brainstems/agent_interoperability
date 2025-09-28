import { describe, it, expect, beforeAll } from 'vitest'
import { CRMEventPublisher } from '../../src/lib/crm-event-publisher'

describe('Event Bus Core Integration', () => {
  let eventPublisher: CRMEventPublisher
  const testChurchId = 'test-church-core'
  const testMemberId = 'test-member-core'

  beforeAll(() => {
    eventPublisher = new CRMEventPublisher()
  })

  it('should initialize CRM event publisher', () => {
    expect(eventPublisher).toBeTruthy()
    expect(typeof eventPublisher.publishMemberEvent).toBe('function')
    expect(typeof eventPublisher.publishDonationEvent).toBe('function')
    expect(typeof eventPublisher.publishEngagementEvent).toBe('function')
  })

  it('should publish member events and return event ID', async () => {
    const memberData = {
      first_name: 'Test',
      last_name: 'Member',
      email: 'test@example.com'
    }

    const eventId = await eventPublisher.publishMemberEvent('created', testMemberId, testChurchId, memberData)
    
    expect(eventId).toBeTruthy()
    expect(typeof eventId).toBe('string')
    expect(eventId.length).toBeGreaterThan(0)
  })

  it('should publish donation events and return event ID', async () => {
    const donationData = {
      amount: 100.00,
      fundId: 'general-fund',
      memberId: testMemberId
    }

    const eventId = await eventPublisher.publishDonationEvent('created', 'test-donation-core', testChurchId, donationData)
    
    expect(eventId).toBeTruthy()
    expect(typeof eventId).toBe('string')
    expect(eventId.length).toBeGreaterThan(0)
  })

  it('should publish engagement events and return event ID', async () => {
    const eventId = await eventPublisher.publishEngagementEvent('email_open', testMemberId, testChurchId, {
      emailId: 'test-email-core',
      timestamp: new Date().toISOString()
    })
    
    expect(eventId).toBeTruthy()
    expect(typeof eventId).toBe('string')
    expect(eventId.length).toBeGreaterThan(0)
  })

  it('should publish pastoral care events and return event ID', async () => {
    const eventId = await eventPublisher.publishPastoralCareEvent('care_needed', testMemberId, testChurchId, {
      reason: 'Low engagement detected',
      priority: 'medium',
      notes: 'Test pastoral care event'
    })
    
    expect(eventId).toBeTruthy()
    expect(typeof eventId).toBe('string')
    expect(eventId.length).toBeGreaterThan(0)
  })

  it('should publish task events and return event ID', async () => {
    const eventId = await eventPublisher.publishTaskEvent('created', 'test-task-core', testChurchId, {
      taskType: 'follow_up',
      assignedTo: 'pastor@church.com',
      memberId: testMemberId
    })
    
    expect(eventId).toBeTruthy()
    expect(typeof eventId).toBe('string')
    expect(eventId.length).toBeGreaterThan(0)
  })
})
