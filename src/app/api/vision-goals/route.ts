import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/vision-goals - List goals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visionId = searchParams.get('vision_id')
    const goalCode = searchParams.get('goal_code')

    let query = supabase
      .from('vision_goals')
      .select(`
        *,
        vision:visions (
          id,
          title
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (visionId) {
      query = query.eq('vision_id', visionId)
    }

    if (goalCode) {
      query = query.eq('goal_code', goalCode)
    }

    const { data: goals, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      goals
    })
  } catch (error: any) {
    console.error('GET /api/vision-goals error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/vision-goals - Create goal
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      vision_id,
      goal_code,
      name,
      description,
      target_numeric,
      unit,
      due_date,
      kpi_path
    } = body

    // Validation
    if (!vision_id || !name || !target_numeric) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: goal, error } = await supabase
      .from('vision_goals')
      .insert({
        vision_id,
        goal_code,
        name,
        description,
        target_numeric,
        current_value: 0,
        unit,
        due_date,
        kpi_path
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      goal
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/vision-goals error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
