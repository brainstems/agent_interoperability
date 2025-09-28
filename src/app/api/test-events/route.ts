import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { publishMemberCreated, publishDonationReceived, publishEventCreated } from '@/lib/crm-event-publisher'
import { getAgentEventSubscriber } from '@/lib/agent-event-subscriber'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { testType } = await request.json()
    const results: any[] = []

    switch (testType) {
      case 'member_created':
        // Test member creation event flow
        const testMemberId = `test_member_${Date.now()}`
        await publishMemberCreated(
          testMemberId,
          user.churchId || '',
          {
            firstName: 'Test',
            lastName: 'Member',
            email: 'test@example.com',
            isNewMember: true
          },
          user.id
        )
        results.push({ type: 'member.created', status: 'published', memberId: testMemberId })
        break

      case 'donation_received':
        // Test donation event flow
        const testDonationId = `test_donation_${Date.now()}`
        await publishDonationReceived(
          testDonationId,
          user.churchId || '',
          {
            amount: 100,
            fundName: 'General Fund',
            memberName: 'Test Donor',
            memberEmail: 'donor@example.com'
          },
          user.id
        )
        results.push({ type: 'donation.received', status: 'published', donationId: testDonationId })
        break

      case 'agent_subscriptions':
        // Test agent subscription status
        const subscriber = getAgentEventSubscriber()
        const activeSubscriptions = subscriber.getActiveSubscriptions()
        results.push({
          type: 'agent_subscriptions',
          count: activeSubscriptions.length,
          subscriptions: activeSubscriptions.map(sub => ({
            agentType: sub.agentType,
            eventTypes: sub.eventTypes,
            isActive: sub.isActive
          }))
        })
        break

      case 'event_logs':
        // Check recent agent event logs
        const { data: logs } = await supabase
          .from('agent_event_logs')
          .select('*')
          .eq('church_id', user.churchId)
          .order('created_at', { ascending: false })
          .limit(10)

        results.push({
          type: 'recent_logs',
          count: logs?.length || 0,
          logs: logs || []
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: member_created, donation_received, agent_subscriptions, event_logs' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      testType,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Event test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
