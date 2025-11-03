import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/visions/[id] - Get single vision
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: vision, error } = await supabase
      .from('visions')
      .select(`
        *,
        vision_goals (
          id,
          goal_code,
          name,
          description,
          target_numeric,
          current_value,
          unit,
          due_date,
          kpi_path
        ),
        campaigns:campaigns!vision_id (
          id,
          name,
          description,
          start_date,
          end_date,
          public_url_slug,
          status,
          goal_amount,
          amount_raised
        ),
        organization:organizations (
          id,
          name,
          organization_type
        )
      `)
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Vision not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      vision
    })
  } catch (error: any) {
    console.error('GET /api/visions/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/visions/[id] - Update vision
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      video_url
    } = body

    const { data: vision, error } = await supabase
      .from('visions')
      .update({
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
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      vision
    })
  } catch (error: any) {
    console.error('PUT /api/visions/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/visions/[id] - Soft delete vision
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('visions')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'ARCHIVED'
      })
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Vision archived successfully'
    })
  } catch (error: any) {
    console.error('DELETE /api/visions/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
