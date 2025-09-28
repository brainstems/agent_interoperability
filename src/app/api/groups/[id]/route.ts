import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = params

    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          id,
          role,
          member:profiles(id, first_name, last_name, email)
        )
      `)
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (error || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: group
    })
  } catch (error) {
    console.error('Get group error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get group' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: 'Group update not implemented yet'
    }, { status: 501 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update group' },
      { status: 500 }
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

    return NextResponse.json({
      success: false,
      error: 'Group deletion not implemented yet'
    }, { status: 501 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
