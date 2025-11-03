import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/visions/public/[slug] - Get public vision (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Find campaign by slug, get its vision
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('vision_id')
      .eq('public_url_slug', params.slug)
      .single()

    let visionId = campaign?.vision_id

    // If no campaign found, try direct vision lookup by ID
    if (!visionId) {
      visionId = params.slug
    }

    const { data: vision, error } = await supabase
      .from('visions')
      .select(`
        id,
        title,
        subtitle,
        one_sentence_anchor,
        narrative_markdown,
        theological_basis_markdown,
        hero_image_url,
        video_url,
        scripture_references,
        faqs,
        vision_goals!inner (
          id,
          name,
          target_numeric,
          current_value,
          unit,
          due_date
        ),
        campaigns!vision_id (
          id,
          name,
          description,
          start_date,
          end_date,
          public_url_slug,
          status
        )
      `)
      .eq('id', visionId)
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Vision not found or not published' },
          { status: 404 }
        )
      }
      throw error
    }

    // Get featured stories
    const { data: stories } = await supabase
      .from('stories')
      .select('id, title, excerpt, featured_image_url, published_at')
      .or(`vision_id.eq.${visionId},campaign_id.in.(${vision.campaigns?.map((c: any) => c.id).join(',') || ''})`)
      .eq('status', 'PUBLISHED')
      .eq('featured', true)
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(6)

    return NextResponse.json({
      success: true,
      vision: {
        ...vision,
        featured_stories: stories || []
      }
    })
  } catch (error: any) {
    console.error('GET /api/visions/public/[slug] error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
