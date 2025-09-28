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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const groupType = searchParams.get('groupType')
    const isActive = searchParams.get('isActive')

    const offset = (page - 1) * limit

    // Build Supabase query
    let query = supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          id,
          role,
          member:profiles(id, first_name, last_name, email)
        )
      `, { count: 'exact' })
      .eq('church_id', user.churchId)

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply filters
    if (groupType) {
      query = query.eq('group_type', groupType)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Get groups with pagination
    const { data: groups, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    const total = count || 0

    return NextResponse.json({
      success: true,
      data: groups || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, group_type, leader_id, meeting_schedule, max_capacity } = body

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        church_id: user.churchId,
        name,
        description,
        group_type,
        leader_id,
        meeting_schedule,
        max_capacity,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: group
    }, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
