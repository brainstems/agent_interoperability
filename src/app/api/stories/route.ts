import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/stories - List stories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaign_id')
    const visionId = searchParams.get('vision_id')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('stories')
      .select(`
        *,
        campaign:campaigns (
          id,
          name
        ),
        vision:visions (
          id,
          title
        ),
        author:profiles (
          id,
          first_name,
          last_name
        )
      `)
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (type && type !== 'all') {
      query = query.eq('story_type', type)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (visionId) {
      query = query.eq('vision_id', visionId)
    }

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    const { data: stories, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      stories
    })
  } catch (error: any) {
    console.error('GET /api/stories error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/stories - Create story
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
      body_markdown,
      excerpt,
      story_type,
      featured_image_url,
      media_url,
      media_type,
      tags,
      impact_metrics,
      campaign_id,
      vision_id,
      project_id,
      church_id,
      consent_obtained,
      consent_date,
      author_name
    } = body

    // Validation
    if (!title || !body_markdown) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Create story
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        title,
        subtitle,
        body_markdown,
        excerpt: excerpt || body_markdown.substring(0, 200),
        story_type: story_type || 'update',
        featured_image_url,
        media_url,
        media_type,
        tags: tags || [],
        impact_metrics: impact_metrics || {},
        campaign_id,
        vision_id,
        project_id,
        church_id,
        author_id: user.id,
        author_name,
        consent_obtained: consent_obtained || false,
        consent_date,
        status: 'DRAFT',
        featured: false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      story
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/stories error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
