import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthService } from '@/lib/auth'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.substring(7)
  const user = await AuthService.getCurrentUser(token)

  if (!user || !user.churchId) {
    throw new Error('Invalid or expired token')
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30' // days

    const daysAgo = parseInt(timeframe)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get member statistics
    const { data: allMembers } = await supabase
      .from('members')
      .select('member_status, created_at')
      .eq('church_id', user.churchId!)

    const memberStats = (allMembers || []).reduce((acc: any, member: any) => {
      const status = member.member_status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const totalMembers = allMembers?.length || 0

    const newMembersThisPeriod = (allMembers || []).filter(
      (member: any) => new Date(member.created_at) >= startDate
    ).length

    // Get donation statistics
    const { data: recentDonations } = await supabase
      .from('donations')
      .select('amount')
      .eq('church_id', user.churchId!)
      .gte('donation_date', startDate.toISOString())

    const { data: allDonations } = await supabase
      .from('donations')
      .select('amount')
      .eq('church_id', user.churchId!)

    const donationStats = {
      _sum: { amount: (recentDonations || []).reduce((sum: number, d: any) => sum + (d.amount || 0), 0) },
      _count: { id: recentDonations?.length || 0 }
    }

    const totalDonationsAllTime = {
      _sum: { amount: (allDonations || []).reduce((sum: number, d: any) => sum + (d.amount || 0), 0) }
    }

    // Get donation trends by fund
    const { data: donationsWithFunds } = await supabase
      .from('donations')
      .select('fund_id, amount')
      .eq('church_id', user.churchId!)
      .gte('donation_date', startDate.toISOString())

    const donationsByFund = (donationsWithFunds || []).reduce((acc: any, donation: any) => {
      const fundId = donation.fund_id
      if (!acc[fundId]) {
        acc[fundId] = { fundId, _sum: { amount: 0 }, _count: { id: 0 } }
      }
      acc[fundId]._sum.amount += donation.amount || 0
      acc[fundId]._count.id += 1
      return acc
    }, {})

    const fundIds = Object.keys(donationsByFund)
    const { data: funds } = await supabase
      .from('funds')
      .select('id, name')
      .eq('church_id', user.churchId!)
      .in('id', fundIds)

    const donationTrends = Object.values(donationsByFund).map((donation: any) => {
      const fund = (funds || []).find((f: any) => f.id === donation.fundId)
      return {
        fundId: donation.fundId,
        fundName: fund?.name || 'Unknown Fund',
        totalAmount: donation._sum.amount || 0,
        donationCount: donation._count.id
      }
    })

    // Get event statistics
    const { data: upcomingEventsData } = await supabase
      .from('events')
      .select('id')
      .eq('church_id', user.churchId!)
      .gte('start_date_time', new Date().toISOString())

    const upcomingEvents = upcomingEventsData?.length || 0

    const { data: recentEventsData } = await supabase
      .from('events')
      .select('id, title, start_date_time, event_type')
      .eq('church_id', user.churchId!)
      .gte('start_date_time', startDate.toISOString())
      .lte('start_date_time', new Date().toISOString())
      .order('start_date_time', { ascending: false })
      .limit(5)

    // Get check-ins and registrations for recent events
    const eventIds = (recentEventsData || []).map((e: any) => e.id)
    const { data: checkInsData } = await supabase
      .from('check_ins')
      .select('event_id')
      .in('event_id', eventIds)

    const { data: registrationsData } = await supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds)

    const checkInCounts = (checkInsData || []).reduce((acc: any, ci: any) => {
      acc[ci.event_id] = (acc[ci.event_id] || 0) + 1
      return acc
    }, {})

    const registrationCounts = (registrationsData || []).reduce((acc: any, reg: any) => {
      acc[reg.event_id] = (acc[reg.event_id] || 0) + 1
      return acc
    }, {})

    const recentEvents = (recentEventsData || []).map((event: any) => ({
      ...event,
      _count: {
        checkIns: checkInCounts[event.id] || 0,
        registrations: registrationCounts[event.id] || 0
      }
    }))

    // Get group statistics
    const { data: activeGroupsData } = await supabase
      .from('groups')
      .select('id')
      .eq('church_id', user.churchId!)
      .eq('is_active', true)

    const activeGroups = activeGroupsData?.length || 0

    const { data: groupMemberships } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(church_id)')
      .eq('groups.church_id', user.churchId!)

    const groupMembershipStats = (groupMemberships || []).reduce((acc: any, gm: any) => {
      const groupId = gm.group_id
      if (!acc[groupId]) {
        acc[groupId] = { groupId, _count: { memberId: 0 } }
      }
      acc[groupId]._count.memberId += 1
      return acc
    }, {})

    // Get check-in statistics
    const { data: recentCheckInsData } = await supabase
      .from('check_ins')
      .select('id')
      .eq('church_id', user.churchId!)
      .gte('check_in_time', startDate.toISOString())

    const recentCheckIns = recentCheckInsData?.length || 0

    // Get communication statistics
    const { data: communicationsData } = await supabase
      .from('communications')
      .select('id')
      .eq('church_id', user.churchId!)
      .gte('created_at', startDate.toISOString())

    const recentCommunications = communicationsData?.length || 0

    // Get top donors
    const { data: donorDonations } = await supabase
      .from('donations')
      .select('member_id, amount')
      .eq('church_id', user.churchId!)
      .gte('donation_date', startDate.toISOString())

    const donorTotals = (donorDonations || []).reduce((acc: any, donation: any) => {
      const memberId = donation.member_id
      acc[memberId] = (acc[memberId] || 0) + (donation.amount || 0)
      return acc
    }, {})

    const topDonors = Object.entries(donorTotals)
      .map(([memberId, amount]) => ({ memberId, _sum: { amount } }))
      .sort((a: any, b: any) => b._sum.amount - a._sum.amount)
      .slice(0, 5)

    const memberIds = topDonors.map((d: any) => d.memberId)
    const { data: topDonorMembers } = await supabase
      .from('members')
      .select('id, first_name, last_name')
      .in('id', memberIds)

    const topDonorsWithNames = topDonors.map((donor: any) => {
      const member = (topDonorMembers || []).find((m: any) => m.id === donor.memberId)
      return {
        memberId: donor.memberId,
        memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        totalAmount: donor._sum.amount || 0
      }
    })

    // Get attendance trends
    const { data: attendanceCheckIns } = await supabase
      .from('check_ins')
      .select('event_id, member_id')
      .eq('church_id', user.churchId!)
      .gte('check_in_time', startDate.toISOString())

    const attendanceTrends = (attendanceCheckIns || []).reduce((acc: any, checkIn: any) => {
      const eventId = checkIn.event_id
      if (!acc[eventId]) {
        acc[eventId] = { eventId, _count: { memberId: 0 } }
      }
      acc[eventId]._count.memberId += 1
      return acc
    }, {})

    const attendanceEventIds = Object.keys(attendanceTrends)
    const { data: attendanceEvents } = await supabase
      .from('events')
      .select('id, title, start_date_time, event_type')
      .in('id', attendanceEventIds)

    const attendanceData = Object.values(attendanceTrends).map((attendance: any) => {
      const event = (attendanceEvents || []).find((e: any) => e.id === attendance.eventId)
      return {
        eventId: attendance.eventId,
        eventTitle: event?.title || 'Unknown Event',
        eventDate: event?.start_date_time,
        eventType: event?.event_type,
        attendanceCount: attendance._count.memberId
      }
    }).sort((a: any, b: any) => b.attendanceCount - a.attendanceCount)

    const dashboardData = {
      overview: {
        totalMembers,
        newMembersThisPeriod,
        activeGroups,
        upcomingEvents,
        recentCheckIns,
        recentCommunications
      },
      memberStats,
      donationStats: {
        totalThisPeriod: donationStats._sum.amount || 0,
        countThisPeriod: donationStats._count.id,
        totalAllTime: totalDonationsAllTime._sum.amount || 0,
        trends: donationTrends
      },
      topDonors: topDonorsWithNames,
      recentEvents: recentEvents.map((event: any) => ({
        id: event.id,
        title: event.title,
        startDateTime: event.start_date_time,
        eventType: event.event_type,
        checkInCount: event._count.checkIns,
        registrationCount: event._count.registrations
      })),
      attendanceTrends: attendanceData.slice(0, 10),
      groupStats: {
        totalActive: activeGroups,
        membershipDistribution: Object.values(groupMembershipStats).map((stat: any) => ({
          groupId: stat.groupId,
          memberCount: stat._count.memberId
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get dashboard data'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
