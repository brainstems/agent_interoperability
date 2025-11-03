import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/visions - List visions
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const organizationId = searchParams.get('organization_id')
    
    let query = supabase
      .from('visions')
      .select(`
        *,
        vision_goals (
          id,
          name,
          target_numeric,
          current_value,
          unit,
          due_date
        ),
        campaigns:campaigns!vision_id (
          id,
          name,
          status
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: visions, error } = await query

    if (error) throw error

    // Enhance with counts
    const enhanced = visions?.map(vision => ({
      ...vision,
      goal_count: vision.vision_goals?.length || 0,
      campaign_count: vision.campaigns?.length || 0
    }))

    return NextResponse.json({
      success: true,
      visions: enhanced
    })
  } catch (error: any) {
    console.error('GET /api/visions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/visions - Create vision
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      subtitle,
      horizon,
      theological_basis_markdown,
      narrative_markdown,
      one_sentence_anchor,
      scripture_references,
      faqs,
      small_group_guide_markdown,
      youth_summary_markdown,
      kids_summary_markdown,
      leader_toolkit_markdown,
      hero_image_url,
      video_url,
      church_id,
      organization_id
    } = body

    // Validation
    if (!title || !horizon || !theological_basis_markdown || !narrative_markdown) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create vision
    const { data: vision, error } = await supabase
      .from('visions')
      .insert({
        title,
        subtitle,
        horizon,
        theological_basis_markdown,
        narrative_markdown,
        one_sentence_anchor,
        scripture_references: scripture_references || [],
        faqs: faqs || [],
        small_group_guide_markdown,
        youth_summary_markdown,
        kids_summary_markdown,
        leader_toolkit_markdown,
        hero_image_url,
        video_url,
        church_id,
        organization_id,
        created_by: user.id,
        status: 'DRAFT'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      vision
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/visions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
