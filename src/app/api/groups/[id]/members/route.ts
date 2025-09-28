import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.substring(7)
  const user = await verifyAuth(request)

  if (!user || !user.church_id) {
    throw new Error('Invalid or expired token')
  }

  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    const { id: groupId } = params
    const body = await request.json()
    const { memberId, isLeader = false } = body

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if group exists and belongs to user's church
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .eq('church_id', user.church_id!)
      .single()

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if member exists and belongs to user's church
    const { data: member } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .eq('church_id', user.church_id!)
      .single()

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if member is already in the group
    const { data: existingMembership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: 'Member is already in this group' },
        { status: 409 }
      )
    }

    // Add member to group
    const { data: groupMember, error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        member_id: memberId,
        is_leader: isLeader
      })
      .select(`
        *,
        profiles!member_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        groups!group_id (
          id,
          name,
          group_type
        )
      `)
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      success: true,
      data: groupMember,
      message: `Member ${isLeader ? 'leader' : 'member'} added successfully`
    }, { status: 201 })
  } catch (error) {
    console.error('Add group member error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to add member to group'
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
    const user = await getAuthenticatedUser(request)
    const { id: groupId } = params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if group exists and belongs to user's church
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .eq('church_id', user.church_id!)
      .single()

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if membership exists
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Member is not in this group' },
        { status: 404 }
      )
    }

    // Remove member from group
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('member_id', memberId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from group successfully'
    })
  } catch (error) {
    console.error('Remove group member error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove member from group'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
