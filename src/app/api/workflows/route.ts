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
    const triggerType = searchParams.get('triggerType')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps(*)
      `)
      .eq('church_id', user.churchId)

    if (status) query = query.eq('status', status)
    if (triggerType) query = query.eq('trigger_type', triggerType)

    const { data: workflows, error, count } = await query
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      data: workflows || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching workflows:', error)
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
      workflow_type,
      trigger,
      church_id
    } = body

    if (!workflow_type || !trigger) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow_type, trigger' },
        { status: 400 }
      )
    }

    // Create workflow execution record
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        church_id: church_id || user.churchId,
        name: `${workflow_type} workflow`,
        trigger_type: trigger,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Simulate triggering agents based on workflow type
    const agentsTriggered = workflow_type === 'member_retention' ? 3 : 1

    return NextResponse.json({ 
      workflow_id: workflow.id,
      agents_triggered: agentsTriggered,
      data: workflow 
    }, { status: 200 })
  } catch (error) {
    console.error('Error creating workflow:', error)
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
      name,
      description,
      trigger_type,
      trigger_conditions,
      is_active
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    // Verify workflow belongs to user's church
    const { data: existingWorkflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (!existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (trigger_type !== undefined) updateData.trigger_type = trigger_type
    if (trigger_conditions !== undefined) updateData.trigger_conditions = trigger_conditions
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        workflow_steps(*)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: workflow })
  } catch (error) {
    console.error('Error updating workflow:', error)
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
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    // Verify workflow belongs to user's church
    const existingWorkflow = await supabase
      .from('workflows')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (!existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Delete workflow steps first, then workflow
    await supabase
      .from('workflow_steps')
      .delete()
      .eq('workflow_id', id)

    await supabase
      .from('workflows')
      .delete()
      .eq('id', id)

    return NextResponse.json({ message: 'Workflow deleted successfully' })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
