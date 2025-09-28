import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'
import { CreateEventForm, EventFilters } from '@/types'
import { publishEventCreated } from '@/lib/crm-event-publisher'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const filtersParam = searchParams.get('filters')
    
    let filters: EventFilters = {}
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch (e) {
        // Invalid JSON, ignore filters
      }
    }

    const offset = (page - 1) * limit

    // Build Supabase query
    let query = supabase
      .from('events')
      .select(`
        *,
        registrations:event_registrations(
          id,
          member:profiles(id, first_name, last_name)
        ),
        attendance:event_attendance(
          id,
          member:profiles(id, first_name, last_name)
        )
      `)
      .eq('church_id', user.churchId)

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
    }

    // Apply filters
    if (filters.eventType && filters.eventType.length > 0) {
      query = query.in('event_type', filters.eventType)
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      query = query
        .gte('start_datetime', filters.dateRange[0])
        .lte('start_datetime', filters.dateRange[1])
    }

    // Get events with pagination
    const { data: events, error, count } = await query
      .order('start_datetime', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: events || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get events error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get events'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateEventForm = await request.json()

    // Validate required fields
    if (!body.title || !body.startDateTime || !body.endDateTime) {
      return NextResponse.json(
        { success: false, error: 'Title, start date/time, and end date/time are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(body.startDateTime)
    const endDate = new Date(body.endDateTime)

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'End date/time must be after start date/time' },
        { status: 400 }
      )
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Event cannot be scheduled in the past' },
        { status: 400 }
      )
    }

    // Create event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        church_id: user.churchId,
        title: body.title,
        description: body.description,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        location: body.location,
        event_type: body.eventType,
        registration_required: body.registrationRequired,
        max_attendees: body.maxAttendees
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Publish event.created event to trigger AI agent workflows
    try {
      await publishEventCreated(
        event.id,
        user.churchId || '',
        {
          eventId: event.id,
          title: event.title,
          description: event.description,
          startDateTime: event.start_datetime,
          endDateTime: event.end_datetime,
          location: event.location,
          eventType: event.event_type,
          registrationRequired: event.registration_required,
          maxAttendees: event.max_attendees
        },
        user.id
      )
    } catch (eventError) {
      // Log event publishing error but don't fail the event creation
      console.error('Failed to publish event.created event:', eventError)
    }

    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
