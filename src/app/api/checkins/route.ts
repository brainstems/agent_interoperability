import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthService } from '@/lib/auth'
import { CreateCheckInForm, CheckInFilters } from '@/types'

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
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const filtersParam = searchParams.get('filters')
    
    let filters: CheckInFilters = {}
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch (e) {
        // Invalid JSON, ignore filters
      }
    }

    const skip = (page - 1) * limit

    // Build Supabase query
    let query = supabase
      .from('check_ins')
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          birth_date
        ),
        events!inner(
          id,
          title,
          start_date_time,
          event_type
        ),
        users!check_ins_checked_in_by_id_fkey(
          id,
          email
        )
      `)
      .eq('church_id', user.churchId!)
      .order('check_in_time', { ascending: false })
      .range(skip, skip + limit - 1)

    if (filters.eventId) {
      query = query.eq('event_id', filters.eventId)
    }

    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      query = query
        .gte('check_in_time', filters.dateRange[0])
        .lte('check_in_time', filters.dateRange[1])
    }

    if (search) {
      // For search, we'll need to do a more complex query
      query = query.or(`members.first_name.ilike.%${search}%,members.last_name.ilike.%${search}%,events.title.ilike.%${search}%`)
    }

    const { data: checkIns } = await query

    // Get total count
    let countQuery = supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', user.churchId!)

    if (filters.eventId) {
      countQuery = countQuery.eq('event_id', filters.eventId)
    }

    if (filters.memberId) {
      countQuery = countQuery.eq('member_id', filters.memberId)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      countQuery = countQuery
        .gte('check_in_time', filters.dateRange[0])
        .lte('check_in_time', filters.dateRange[1])
    }

    const { count: total } = await countQuery

    const formattedCheckIns = (checkIns || []).map((checkIn: any) => ({
      ...checkIn,
      member: checkIn.members,
      event: checkIn.events,
      checkedInBy: checkIn.users,
      checkInTime: checkIn.check_in_time,
      eventId: checkIn.event_id,
      memberId: checkIn.member_id,
      checkedInById: checkIn.checked_in_by_id,
      churchId: checkIn.church_id,
      securityCode: checkIn.security_code,
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at
    }))

    const totalPages = Math.ceil((total || 0) / limit)

    return NextResponse.json({
      success: true,
      data: formattedCheckIns,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get check-ins error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get check-ins'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    const body: CreateCheckInForm = await request.json()

    // Validate required fields
    if (!body.memberId || !body.eventId) {
      return NextResponse.json(
        { success: false, error: 'Member ID and Event ID are required' },
        { status: 400 }
      )
    }

    // Check if member exists and belongs to user's church
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', body.memberId)
      .eq('church_id', user.churchId!)
      .single()

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if event exists and belongs to user's church
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', body.eventId)
      .eq('church_id', user.churchId!)
      .single()

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if member is already checked in for this event
    const { data: existingCheckIn } = await supabase
      .from('check_ins')
      .select('*')
      .eq('member_id', body.memberId)
      .eq('event_id', body.eventId)
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        { success: false, error: 'Member is already checked in for this event' },
        { status: 409 }
      )
    }

    // Create check-in
    const { data: checkIn } = await supabase
      .from('check_ins')
      .insert({
        church_id: user.churchId!,
        member_id: body.memberId,
        event_id: body.eventId,
        checked_in_by_id: user.id,
        check_in_time: new Date().toISOString(),
        security_code: body.securityCode,
        notes: body.notes
      })
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          birth_date
        ),
        events!inner(
          id,
          title,
          start_date_time,
          event_type
        ),
        users!check_ins_checked_in_by_id_fkey(
          id,
          email
        )
      `)
      .single()

    const formattedCheckIn = checkIn ? {
      ...checkIn,
      member: checkIn.members,
      event: checkIn.events,
      checkedInBy: checkIn.users,
      checkInTime: checkIn.check_in_time,
      eventId: checkIn.event_id,
      memberId: checkIn.member_id,
      checkedInById: checkIn.checked_in_by_id,
      churchId: checkIn.church_id,
      securityCode: checkIn.security_code,
      createdAt: checkIn.created_at,
      updatedAt: checkIn.updated_at
    } : null

    return NextResponse.json({
      success: true,
      data: formattedCheckIn,
      message: 'Check-in recorded successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create check-in error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to record check-in'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
