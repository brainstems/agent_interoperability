import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/projects/[id]/impact - Calculate impact for a given amount
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { amount_dollars } = body

    if (!amount_dollars || amount_dollars <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount required' },
        { status: 400 }
      )
    }

    // Get project details
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate impact
    const impact_value = amount_dollars * (project.impact_per_100_dollars / 100)
    
    // Generate narrative
    let narrative = project.impact_narrative_template || 
      `Your ${amount_dollars} gift will provide ${impact_value.toFixed(1)} ${project.impact_unit}.`

    narrative = narrative
      .replace('{amount}', `$${amount_dollars.toLocaleString()}`)
      .replace('{impact}', impact_value.toFixed(1))
      .replace('{unit}', project.impact_unit)

    // Get example outcomes scaled to this amount
    const scaled_examples = project.example_outcomes?.map((example: string) => {
      // Simple scaling logic - can be enhanced
      return example.replace(/\d+/g, (match) => {
        const num = parseInt(match)
        const scaled = Math.round(num * (amount_dollars / 100))
        return scaled.toString()
      })
    }) || []

    return NextResponse.json({
      success: true,
      impact: {
        amount_dollars,
        impact_value,
        impact_unit: project.impact_unit,
        narrative,
        examples: scaled_examples,
        project_name: project.name,
        project_description: project.description
      }
    })
  } catch (error: any) {
    console.error('POST /api/projects/[id]/impact error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/impact - Get project impact details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        campaign:campaigns (
          id,
          name,
          goal_amount,
          amount_raised,
          vision:visions (
            id,
            title,
            one_sentence_anchor
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Calculate current impact from raised funds
    const raised_dollars = project.raised_cents / 100
    const current_impact = raised_dollars * (project.impact_per_100_dollars / 100)
    const goal_dollars = project.goal_cents / 100
    const goal_impact = goal_dollars * (project.impact_per_100_dollars / 100)

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        raised_dollars,
        goal_dollars,
        current_impact,
        goal_impact,
        progress_percentage: project.goal_cents > 0
          ? Math.round((project.raised_cents / project.goal_cents) * 100)
          : 0
      }
    })
  } catch (error: any) {
    console.error('GET /api/projects/[id]/impact error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
