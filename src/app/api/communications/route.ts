import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuthService } from '@/lib/auth'
import { CreateCommunicationForm, CommunicationFilters } from '@/types'

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
    
    let filters: CommunicationFilters = {}
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
      .from('communications')
      .select(`
        *,
        users!communications_sender_id_fkey(
          id,
          email
        )
      `)
      .eq('church_id', user.churchId!)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (search) {
      query = query.or(`subject.ilike.%${search}%,content.ilike.%${search}%`)
    }

    if (filters.communicationType && filters.communicationType.length > 0) {
      query = query.in('communication_type', filters.communicationType)
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      query = query
        .gte('created_at', filters.dateRange[0])
        .lte('created_at', filters.dateRange[1])
    }

    const { data: communications } = await query

    // Get recipients for each communication
    const communicationIds = (communications || []).map((c: any) => c.id)
    const { data: recipients } = await supabase
      .from('communication_recipients')
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .in('communication_id', communicationIds)

    // Group recipients by communication
    const recipientsByComm = (recipients || []).reduce((acc: any, recipient: any) => {
      if (!acc[recipient.communication_id]) {
        acc[recipient.communication_id] = []
      }
      acc[recipient.communication_id].push({
        ...recipient,
        member: recipient.members
      })
      return acc
    }, {})

    // Get total count
    let countQuery = supabase
      .from('communications')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', user.churchId!)

    if (search) {
      countQuery = countQuery.or(`subject.ilike.%${search}%,content.ilike.%${search}%`)
    }

    if (filters.communicationType && filters.communicationType.length > 0) {
      countQuery = countQuery.in('communication_type', filters.communicationType)
    }

    if (filters.status && filters.status.length > 0) {
      countQuery = countQuery.in('status', filters.status)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      countQuery = countQuery
        .gte('created_at', filters.dateRange[0])
        .lte('created_at', filters.dateRange[1])
    }

    const { count: total } = await countQuery

    const totalPages = Math.ceil((total || 0) / limit)

    const formattedCommunications = (communications || []).map((comm: any) => ({
      ...comm,
      sender: comm.users,
      recipients: recipientsByComm[comm.id] || [],
      _count: {
        recipients: (recipientsByComm[comm.id] || []).length
      },
      communicationType: comm.communication_type,
      senderId: comm.sender_id,
      churchId: comm.church_id,
      scheduledFor: comm.scheduled_for,
      createdAt: comm.created_at,
      updatedAt: comm.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: formattedCommunications,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get communications error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get communications'
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
    const body: CreateCommunicationForm = await request.json()

    // Validate required fields
    if (!body.subject || !body.content || !body.communicationType) {
      return NextResponse.json(
        { success: false, error: 'Subject, content, and communication type are required' },
        { status: 400 }
      )
    }

    if (!body.recipientIds || body.recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      )
    }

    // Validate recipients exist and belong to user's church
    const { data: recipients } = await supabase
      .from('members')
      .select('id')
      .in('id', body.recipientIds)
      .eq('church_id', user.churchId!)

    if ((recipients || []).length !== body.recipientIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more recipients not found' },
        { status: 404 }
      )
    }

    // Create communication
    const { data: communication } = await supabase
      .from('communications')
      .insert({
        church_id: user.churchId!,
        sender_id: user.id,
        subject: body.subject,
        content: body.content,
        communication_type: body.communicationType,
        status: 'DRAFT',
        scheduled_for: body.scheduledFor ? new Date(body.scheduledFor).toISOString() : null
      })
      .select()
      .single()

    if (!communication) {
      throw new Error('Failed to create communication')
    }

    // Create recipient records
    const recipientData = body.recipientIds.map(memberId => ({
      communication_id: communication.id,
      member_id: memberId,
      status: 'PENDING'
    }))

    await supabase
      .from('communication_recipients')
      .insert(recipientData)

    // Get the created communication with relations
    const { data: sender } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .single()

    const { data: communicationRecipients } = await supabase
      .from('communication_recipients')
      .select(`
        *,
        members!inner(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('communication_id', communication.id)

    const createdCommunication = {
      ...communication,
      sender,
      recipients: (communicationRecipients || []).map((cr: any) => ({
        ...cr,
        member: cr.members
      })),
      _count: {
        recipients: (communicationRecipients || []).length
      },
      communicationType: communication.communication_type,
      senderId: communication.sender_id,
      churchId: communication.church_id,
      scheduledFor: communication.scheduled_for,
      createdAt: communication.created_at,
      updatedAt: communication.updated_at
    }

    return NextResponse.json({
      success: true,
      data: createdCommunication,
      message: 'Communication created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create communication error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create communication'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
