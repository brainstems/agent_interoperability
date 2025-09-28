import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const contactType = searchParams.get('contactType')
    const contactedById = searchParams.get('contactedById')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('contact_history')
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        users!contact_history_contacted_by_id_fkey(
          id,
          email
        )
      `)
      .eq('church_id', user.churchId!)
      .order('contact_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (memberId) query = query.eq('member_id', memberId)
    if (contactType) query = query.eq('contact_type', contactType)
    if (contactedById) query = query.eq('contacted_by_id', contactedById)
    if (startDate) query = query.gte('contact_date', startDate)
    if (endDate) query = query.lte('contact_date', endDate)

    const { data: contactHistory, count } = await query

    // Get total count for pagination
    let countQuery = supabase
      .from('contact_history')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', user.churchId!)

    if (memberId) countQuery = countQuery.eq('member_id', memberId)
    if (contactType) countQuery = countQuery.eq('contact_type', contactType)
    if (contactedById) countQuery = countQuery.eq('contacted_by_id', contactedById)
    if (startDate) countQuery = countQuery.gte('contact_date', startDate)
    if (endDate) countQuery = countQuery.lte('contact_date', endDate)

    const { count: total } = await countQuery

    return NextResponse.json({
      data: (contactHistory || []).map((contact: any) => ({
        ...contact,
        member: contact.members,
        contactedBy: contact.users,
        contactDate: contact.contact_date,
        contactType: contact.contact_type,
        followUpDate: contact.follow_up_date,
        contactedById: contact.contacted_by_id,
        memberId: contact.member_id,
        churchId: contact.church_id,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      })),
      pagination: {
        total: total || 0,
        limit,
        offset,
        hasMore: offset + limit < (total || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching contact history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      memberId,
      contactType,
      subject,
      notes,
      outcome,
      followUpDate,
      contactDate
    } = body

    if (!memberId || !contactType || !notes) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, contactType, notes' },
        { status: 400 }
      )
    }

    const { data: contactHistory } = await supabase
      .from('contact_history')
      .insert({
        church_id: user.churchId!,
        member_id: memberId,
        contacted_by_id: user.id,
        contact_type: contactType,
        subject,
        notes,
        outcome,
        follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
        contact_date: contactDate ? new Date(contactDate).toISOString() : new Date().toISOString()
      })
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        users!contact_history_contacted_by_id_fkey(
          id,
          email
        )
      `)
      .single()

    const formattedContact = contactHistory ? {
      ...contactHistory,
      member: contactHistory.members,
      contactedBy: contactHistory.users,
      contactDate: contactHistory.contact_date,
      contactType: contactHistory.contact_type,
      followUpDate: contactHistory.follow_up_date,
      contactedById: contactHistory.contacted_by_id,
      memberId: contactHistory.member_id,
      churchId: contactHistory.church_id,
      createdAt: contactHistory.created_at,
      updatedAt: contactHistory.updated_at
    } : null

    return NextResponse.json({ data: formattedContact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      contactType,
      subject,
      notes,
      outcome,
      followUpDate,
      contactDate
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Contact history ID is required' }, { status: 400 })
    }

    // Verify contact history belongs to user's church
    const { data: existingContact } = await supabase
      .from('contact_history')
      .select('*')
      .eq('id', id)
      .eq('church_id', user.churchId!)
      .single()

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact history not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (contactType !== undefined) updateData.contact_type = contactType
    if (subject !== undefined) updateData.subject = subject
    if (notes !== undefined) updateData.notes = notes
    if (outcome !== undefined) updateData.outcome = outcome
    if (followUpDate !== undefined) updateData.follow_up_date = followUpDate ? new Date(followUpDate).toISOString() : null
    if (contactDate !== undefined) updateData.contact_date = new Date(contactDate).toISOString()

    const { data: contactHistory } = await supabase
      .from('contact_history')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        users!contact_history_contacted_by_id_fkey(
          id,
          email
        )
      `)
      .single()

    const formattedContact = contactHistory ? {
      ...contactHistory,
      member: contactHistory.members,
      contactedBy: contactHistory.users,
      contactDate: contactHistory.contact_date,
      contactType: contactHistory.contact_type,
      followUpDate: contactHistory.follow_up_date,
      contactedById: contactHistory.contacted_by_id,
      memberId: contactHistory.member_id,
      churchId: contactHistory.church_id,
      createdAt: contactHistory.created_at,
      updatedAt: contactHistory.updated_at
    } : null

    return NextResponse.json({ data: formattedContact })
  } catch (error) {
    console.error('Error updating contact history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Contact history ID is required' }, { status: 400 })
    }

    // Verify contact history belongs to user's church
    const { data: existingContact } = await supabase
      .from('contact_history')
      .select('*')
      .eq('id', id)
      .eq('church_id', user.churchId!)
      .single()

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact history not found' }, { status: 404 })
    }

    await supabase
      .from('contact_history')
      .delete()
      .eq('id', id)

    return NextResponse.json({ message: 'Contact history deleted successfully' })
  } catch (error) {
    console.error('Error deleting contact history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
