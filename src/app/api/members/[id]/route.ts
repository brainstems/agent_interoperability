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

    const { data: member, error } = await supabase
      .from('profiles')
      .select(`
        *,
        family_members!inner(
          family:families(
            id,
            family_name,
            address,
            primary_contact_id,
            members:family_members(
              member:profiles(id, first_name, last_name, member_status)
            )
          )
        ),
        group_members(
          id,
          role,
          group:groups(id, name, group_type, description)
        ),
        donations(
          id,
          amount,
          donation_date,
          fund:funds(id, name)
        ),
        check_ins(
          id,
          check_in_time,
          event:events(id, title, start_datetime)
        ),
        background_checks(
          id,
          check_type,
          status,
          completed_date,
          expiry_date
        ),
        volunteer_assignments(
          id,
          position:volunteer_positions(id, position_name),
          start_date,
          end_date,
          status
        )
      `)
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (error || !member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: member
    })
  } catch (error) {
    console.error('Get member error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get member' },
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

    const { id } = params
    const body = await request.json()

    // Check if member exists and belongs to user's church
    const { data: existingMember, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email already exists for another member
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', body.email)
        .eq('church_id', user.churchId)
        .neq('id', id)
        .single()

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Another member with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Update member
    const { data: updatedMember, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        birth_date: body.birthDate,
        gender: body.gender,
        marital_status: body.maritalStatus,
        member_status: body.memberStatus,
        custom_fields: body.customFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update member' },
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

    const { id } = params

    // Check if member exists and belongs to user's church
    const { data: existingMember, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Delete member (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully'
    })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}
