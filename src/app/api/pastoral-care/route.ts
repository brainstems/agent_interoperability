import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pastoralCare, error } = await supabase
      .from('pastoral_care')
      .select(`
        *,
        member:profiles!pastoral_care_member_id_fkey(id, first_name, last_name),
        caregiver:profiles!pastoral_care_caregiver_id_fkey(id, first_name, last_name)
      `)
      .eq('church_id', user.churchId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: pastoralCare || []
    })
  } catch (error) {
    console.error('Get pastoral care error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get pastoral care records' },
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
    const { member_id, caregiver_id, care_type, notes, follow_up_date } = body

    const { data: pastoralCare, error } = await supabase
      .from('pastoral_care')
      .insert({
        church_id: user.churchId,
        member_id,
        caregiver_id,
        care_type,
        notes,
        follow_up_date,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: pastoralCare
    }, { status: 201 })
  } catch (error) {
    console.error('Create pastoral care error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create pastoral care record' },
      { status: 500 }
    )
  }
}
