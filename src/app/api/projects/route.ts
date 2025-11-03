import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/projects - List projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const visionId = searchParams.get('vision_id')

    let query = supabase
      .from('projects')
      .select(`
        *,
        campaign:campaigns (
          id,
          name,
          vision_id
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (visionId) {
      query = query.eq('campaign.vision_id', visionId)
    }

    const { data: projects, error } = await query

    if (error) throw error

    // Calculate impact for each project
    const enriched = await Promise.all(
      projects?.map(async (project) => {
        const raised_dollars = project.raised_cents / 100
        const impact_value = raised_dollars * (project.impact_per_100_dollars || 0)
        
        return {
          ...project,
          raised_dollars,
          impact_value,
          progress_percentage: project.goal_cents > 0 
            ? Math.round((project.raised_cents / project.goal_cents) * 100)
            : 0
        }
      }) || []
    )

    return NextResponse.json({
      success: true,
      projects: enriched
    })
  } catch (error: any) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create project
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      campaign_id,
      name,
      description,
      goal_cents,
      impact_unit,
      impact_per_100_dollars,
      impact_narrative_template,
      example_outcomes
    } = body

    // Validation
    if (!campaign_id || !name || !impact_unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        campaign_id,
        name,
        description,
        goal_cents: goal_cents || 0,
        raised_cents: 0,
        impact_unit,
        impact_per_100_dollars: impact_per_100_dollars || 0,
        impact_narrative_template,
        example_outcomes: example_outcomes || []
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      project
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/projects error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
