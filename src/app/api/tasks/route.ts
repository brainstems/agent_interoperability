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
    const assigned_to = searchParams.get('assignedTo')
    const member_id = searchParams.get('memberId')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build Supabase query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, email, first_name, last_name),
        creator:profiles!tasks_created_by_fkey(id, email, first_name, last_name),
        member:profiles!tasks_member_id_fkey(id, first_name, last_name, email, phone)
      `, { count: 'exact' })
      .eq('church_id', user.churchId)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }
    if (member_id) {
      query = query.eq('member_id', member_id)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

    // Get tasks with pagination
    const { data: tasks, error, count } = await query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    const total = count || 0

    return NextResponse.json({
      data: tasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
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
      title,
      description,
      task_type,
      priority = 'MEDIUM',
      assigned_to,
      member_id,
      due_date,
      metadata
    } = body

    if (!title || !task_type || !assigned_to) {
      return NextResponse.json(
        { error: 'Missing required fields: title, task_type, assigned_to' },
        { status: 400 }
      )
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        church_id: user.churchId,
        title,
        description,
        task_type,
        priority,
        assigned_to,
        created_by: user.id,
        member_id,
        due_date: due_date || null,
        metadata,
        status: 'PENDING',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, email, first_name, last_name),
        creator:profiles!tasks_created_by_fkey(id, email, first_name, last_name),
        member:profiles!tasks_member_id_fkey(id, first_name, last_name, email, phone)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
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
      title,
      description,
      task_type,
      priority,
      status,
      assigned_to,
      member_id,
      due_date,
      notes,
      metadata
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify task belongs to user's church
    const { data: existingTask, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (task_type !== undefined) updateData.task_type = task_type
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString()
      }
    }
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (member_id !== undefined) updateData.member_id = member_id
    if (due_date !== undefined) updateData.due_date = due_date
    if (notes !== undefined) updateData.notes = notes
    if (metadata !== undefined) updateData.metadata = metadata

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, email, first_name, last_name),
        creator:profiles!tasks_created_by_fkey(id, email, first_name, last_name),
        member:profiles!tasks_member_id_fkey(id, first_name, last_name, email, phone)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error('Error updating task:', error)
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
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify task belongs to user's church
    const { data: existingTask, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
