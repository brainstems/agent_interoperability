import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// Segment DSL Evaluator
function evaluateDSL(definition: any, memberData: any): boolean {
  if (definition.all) {
    return definition.all.every((rule: any) => evaluateRule(rule, memberData))
  }
  if (definition.any) {
    return definition.any.some((rule: any) => evaluateRule(rule, memberData))
  }
  if (definition.none) {
    return !definition.none.some((rule: any) => evaluateRule(rule, memberData))
  }
  return evaluateRule(definition, memberData)
}

function evaluateRule(rule: any, data: any): boolean {
  const { field, op, value } = rule
  
  // Get field value (supports nested paths like "giving_history.total_12m")
  const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data)
  
  switch (op) {
    case '=':
    case 'eq':
      return fieldValue === value
    case '!=':
    case 'neq':
      return fieldValue !== value
    case '>':
    case 'gt':
      return fieldValue > value
    case '>=':
    case 'gte':
      return fieldValue >= value
    case '<':
    case 'lt':
      return fieldValue < value
    case '<=':
    case 'lte':
      return fieldValue <= value
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue)
    case 'contains':
      return String(fieldValue).includes(String(value))
    case 'starts_with':
      return String(fieldValue).startsWith(String(value))
    default:
      return false
  }
}

// GET /api/segments - List segments
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')

    let query = supabase
      .from('segments')
      .select(`
        *,
        segment_members (
          count
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (churchId) {
      query = query.eq('church_id', churchId)
    }

    const { data: segments, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      segments
    })
  } catch (error: any) {
    console.error('GET /api/segments error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/segments - Create segment
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
      definition,
      church_id,
      refresh_cadence
    } = body

    // Validation
    if (!name || !definition) {
      return NextResponse.json(
        { success: false, error: 'Name and definition required' },
        { status: 400 }
      )
    }

    const { data: segment, error } = await supabase
      .from('segments')
      .insert({
        name,
        description,
        definition,
        church_id,
        refresh_cadence: refresh_cadence || 'DAILY',
        member_count: 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      segment
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/segments error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
