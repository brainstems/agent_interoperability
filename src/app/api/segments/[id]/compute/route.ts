import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// DSL Evaluator (same as in segments/route.ts)
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

// POST /api/segments/[id]/compute - Compute segment membership
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get segment definition
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (segmentError || !segment) {
      return NextResponse.json(
        { success: false, error: 'Segment not found' },
        { status: 404 }
      )
    }

    // Get all members for the church
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        church_id,
        donations (
          amount,
          donation_date
        ),
        event_attendance (
          attended
        ),
        propensity_scores (
          propensity_to_give,
          propensity_to_serve,
          engagement_score
        )
      `)
      .eq('church_id', segment.church_id)

    if (membersError) throw membersError

    // Evaluate DSL for each member
    const matchingMembers: string[] = []
    
    for (const member of members || []) {
      // Build member data object with computed fields
      const currentYear = new Date().getFullYear()
      const yearStart = new Date(`${currentYear}-01-01`)
      
      const memberData = {
        ...member,
        giving_history: {
          total_12m: member.donations
            ?.filter((d: any) => new Date(d.donation_date) >= yearStart)
            .reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0
        },
        attendance_rate_12m: member.event_attendance
          ? member.event_attendance.filter((a: any) => a.attended).length / 
            Math.max(member.event_attendance.length, 1)
          : 0,
        propensity_to_give: member.propensity_scores?.[0]?.propensity_to_give || 0,
        propensity_to_serve: member.propensity_scores?.[0]?.propensity_to_serve || 0,
        engagement_score: member.propensity_scores?.[0]?.engagement_score || 0
      }

      // Evaluate DSL
      if (evaluateDSL(segment.definition, memberData)) {
        matchingMembers.push(member.id)
      }
    }

    // Clear existing segment members
    await supabase
      .from('segment_members')
      .delete()
      .eq('segment_id', params.id)

    // Insert new segment members
    if (matchingMembers.length > 0) {
      const { error: insertError } = await supabase
        .from('segment_members')
        .insert(
          matchingMembers.map(memberId => ({
            segment_id: params.id,
            member_id: memberId,
            joined_at: new Date().toISOString()
          }))
        )

      if (insertError) throw insertError
    }

    // Update segment metadata
    await supabase
      .from('segments')
      .update({
        member_count: matchingMembers.length,
        last_computed_at: new Date().toISOString()
      })
      .eq('id', params.id)

    return NextResponse.json({
      success: true,
      member_count: matchingMembers.length,
      segment_id: params.id
    })
  } catch (error: any) {
    console.error('POST /api/segments/[id]/compute error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
