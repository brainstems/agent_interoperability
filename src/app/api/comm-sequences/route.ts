import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/comm-sequences - List communication sequences
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('comm_sequences')
      .select(`
        *,
        campaign:campaigns (
          id,
          name
        ),
        segment:segments (
          id,
          name,
          member_count
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: sequences, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      sequences
    })
  } catch (error: any) {
    console.error('GET /api/comm-sequences error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/comm-sequences - Create communication sequence
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      campaign_id,
      vision_id,
      segment_id,
      schedule
    } = body

    // Validation
    if (!name || !schedule || !Array.isArray(schedule)) {
      return NextResponse.json(
        { success: false, error: 'Name and schedule array required' },
        { status: 400 }
      )
    }

    const { data: sequence, error } = await supabase
      .from('comm_sequences')
      .insert({
        name,
        description,
        campaign_id,
        vision_id,
        segment_id,
        schedule,
        status: 'DRAFT',
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      sequence
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/comm-sequences error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
