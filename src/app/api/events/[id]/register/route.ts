import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'
import { publishEventRegistration } from '@/lib/crm-event-publisher'
import { trackEventRegistration } from '@/lib/engagement-tracker'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: eventId } = params
    const body = await request.json()
    const { memberId } = body

    // If no memberId provided, use current user's member profile
    let targetMemberId = memberId
    if (!targetMemberId && user.memberProfile) {
      targetMemberId = user.memberProfile.id
    }

    if (!targetMemberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if event exists and belongs to user's church
    const { data: event } = await supabase
      .from('events')
      .select(`
        *,
        event_registrations(count)
      `)
      .eq('id', eventId)
      .eq('church_id', user.churchId)
      .single()

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if member exists and belongs to user's church
    const { data: member } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', targetMemberId)
      .eq('church_id', user.churchId)
      .single()

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if registration is required
    if (!event.registration_required) {
      return NextResponse.json(
        { success: false, error: 'This event does not require registration' },
        { status: 400 }
      )
    }

    // Check if already registered
    const { data: existingRegistration } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('member_id', targetMemberId)
      .single()

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'Member is already registered for this event' },
        { status: 409 }
      )
    }

    // Check capacity
    const registrationCount = event.event_registrations?.[0]?.count || 0
    if (event.max_attendees && registrationCount >= event.max_attendees) {
      return NextResponse.json(
        { success: false, error: 'Event is at maximum capacity' },
        { status: 400 }
      )
    }

    // Create registration
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        member_id: targetMemberId,
        status: 'registered',
        registration_date: new Date().toISOString()
      })
      .select(`
        *,
        event:events(id, title, start_datetime),
        member:profiles(id, first_name, last_name, email)
      `)
      .single()

    if (regError) throw regError

    // Publish event registration event
    try {
      await publishEventRegistration(
        eventId,
        targetMemberId,
        user.churchId || '',
        {
          eventName: event.title || '',
          eventDate: event.start_datetime,
          memberName: `${member.first_name} ${member.last_name}`,
          memberEmail: member.email,
          registrationDate: registration.registration_date
        },
        user.id
      )

      // Track engagement
      await trackEventRegistration(targetMemberId, user.churchId || '', {
        eventId,
        eventName: event.title,
        registrationMethod: 'api'
      })
    } catch (eventError) {
      console.error('Failed to publish event registration event:', eventError)
    }

    return NextResponse.json({
      success: true,
      data: registration,
      message: 'Successfully registered for event'
    }, { status: 201 })
  } catch (error) {
    console.error('Event registration error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to register for event'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: eventId } = params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    // If no memberId provided, use current user's member profile
    let targetMemberId = memberId
    if (!targetMemberId && user.memberProfile) {
      targetMemberId = user.memberProfile.id
    }

    if (!targetMemberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if event exists and belongs to user's church
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('church_id', user.churchId || '')
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if registration exists
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('member_id', targetMemberId)
      .single()

    if (regError || !registration) {
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Delete the registration
    const { error: deleteError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('id', registration.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unregistered from event'
    })
  } catch (error) {
    console.error('Event unregistration error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to unregister from event'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
