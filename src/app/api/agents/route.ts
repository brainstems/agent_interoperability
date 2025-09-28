import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const agentType = searchParams.get('agentType')
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query filters
    let query = supabase
      .from('crewai_executions')
      .select(`
        *,
        crewai_logs!inner(*)
      `)
      .eq('church_id', user.churchId)

    if (status) query = query.eq('status', status)
    if (agentType) query = query.eq('agent_type', agentType)
    if (sessionId) query = query.eq('id', sessionId)

    const { data: sessions, error, count } = await query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      sessions: sessions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching agent data:', error)
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
      agent_name,
      church_id,
      context
    } = body

    if (!agent_name) {
      return NextResponse.json(
        { error: 'Missing required field: agent_name' },
        { status: 400 }
      )
    }

    // Create agent execution record
    const { data: execution, error } = await supabase
      .from('crew_executions')
      .insert({
        church_id: church_id || user.churchId,
        status: 'PENDING',
        inputs: context || {},
        metadata: { agent_name },
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true,
      execution_id: execution.id,
      data: execution 
    }, { status: 200 })
  } catch (error) {
    console.error('Error creating agent execution:', error)
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
      sessionId,
      status,
      result,
      metadata
    } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session belongs to user's church
    const { data: existingSession } = await supabase
      .from('crewai_executions')
      .select('*')
      .eq('id', sessionId)
      .eq('church_id', user.churchId)
      .single()

    if (!existingSession) {
      return NextResponse.json({ error: 'Agent session not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
      if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.completed_at = new Date().toISOString()
      }
    }
    if (result !== undefined) updateData.result = result
    if (metadata !== undefined) updateData.metadata = metadata

    const { data: session, error } = await supabase
      .from('crewai_executions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('Error updating agent session:', error)
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
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session belongs to user's church
    const { data: existingSession } = await supabase
      .from('crewai_executions')
      .select('*')
      .eq('id', sessionId)
      .eq('church_id', user.churchId)
      .single()

    if (!existingSession) {
      return NextResponse.json({ error: 'Agent session not found' }, { status: 404 })
    }

    // Delete logs first, then session
    await supabase
      .from('crewai_logs')
      .delete()
      .eq('execution_id', sessionId)

    const { error } = await supabase
      .from('crewai_executions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Agent session deleted successfully' })
  } catch (error) {
    console.error('Error deleting agent session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
