import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

// GET /api/my-impact - Get member's personal impact dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`

    // Get total giving YTD
    const { data: ytdGiving } = await supabase
      .from('donations')
      .select('amount')
      .eq('donor_id', user.id)
      .gte('donation_date', yearStart)

    const total_given_ytd = ytdGiving?.reduce((sum, d) => sum + Number(d.amount), 0) || 0

    // Get lifetime giving
    const { data: lifetimeGiving } = await supabase
      .from('donations')
      .select('amount')
      .eq('donor_id', user.id)

    const total_given_lifetime = lifetimeGiving?.reduce((sum, d) => sum + Number(d.amount), 0) || 0

    // Get projects supported (via payment allocations)
    const { data: projectAllocations } = await supabase
      .from('payment_allocations')
      .select('project_id')
      .eq('tenant_id', user.id) // This would need proper church/tenant filtering

    const projects_supported = new Set(projectAllocations?.map(pa => pa.project_id)).size

    // Get active pledges
    const { data: activePledges } = await supabase
      .from('pledges')
      .select('id, status, cadence')
      .eq('member_id', user.id)
      .eq('status', 'ACTIVE')

    const active_pledges = activePledges?.length || 0
    const recurring_pledges = activePledges?.filter(p => p.cadence !== 'ONE_TIME').length || 0

    // Get volunteer hours (from time pledge fulfillments)
    const { data: volunteerHours } = await supabase
      .from('time_pledge_fulfillments')
      .select('hours_logged')
      .gte('activity_date', yearStart)

    const volunteer_hours = volunteerHours?.reduce((sum, v) => sum + Number(v.hours_logged), 0) || 0

    // Calculate impact summary
    const { data: allocations } = await supabase
      .from('payment_allocations')
      .select(`
        amount_cents,
        project:projects (
          id,
          name,
          impact_unit,
          impact_per_100_dollars
        )
      `)
      .gte('allocated_at', yearStart)

    const impact_summary: Record<string, any> = {}
    allocations?.forEach(alloc => {
      if (alloc.project && alloc.project.impact_unit) {
        const key = alloc.project.impact_unit
        const impact = (alloc.amount_cents / 100) * (alloc.project.impact_per_100_dollars || 0)
        
        if (!impact_summary[key]) {
          impact_summary[key] = { value: 0, unit: alloc.project.impact_unit }
        }
        impact_summary[key].value += impact
      }
    })

    // Get recent gifts
    const { data: recentGifts } = await supabase
      .from('donations')
      .select(`
        id,
        amount,
        donation_date,
        fund:funds (
          name
        )
      `)
      .eq('donor_id', user.id)
      .order('donation_date', { ascending: false })
      .limit(10)

    // Get active pledges with details
    const { data: pledgeDetails } = await supabase
      .from('pledges')
      .select(`
        id,
        amount,
        cadence,
        start_date,
        end_date,
        pledge_allocations (
          amount_cents,
          project:projects (
            name
          )
        )
      `)
      .eq('member_id', user.id)
      .eq('status', 'ACTIVE')

    // Get impact stories related to supported projects
    const { data: stories } = await supabase
      .from('stories')
      .select('id, title, excerpt, featured_image_url, published_at')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false })
      .limit(6)

    // Get quarterly receipt if available
    const quarter = Math.floor((new Date().getMonth()) / 3)
    const { data: receipt } = await supabase
      .from('impact_receipts')
      .select('*')
      .eq('member_id', user.id)
      .eq('receipt_type', 'QUARTERLY')
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        total_given_ytd,
        total_given_lifetime,
        projects_supported,
        active_pledges,
        recurring_pledges,
        volunteer_hours,
        impact_summary,
        recent_gifts: recentGifts?.map(g => ({
          id: g.id,
          amount: Number(g.amount),
          date: g.donation_date,
          fund_name: g.fund?.name || 'General Fund',
          project_name: 'General' // Would need to query from allocations
        })) || [],
        active_pledges_list: pledgeDetails?.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          cadence: p.cadence,
          start_date: p.start_date,
          end_date: p.end_date,
          project_allocations: p.pledge_allocations?.map((pa: any) => ({
            project_name: pa.project?.name || 'Unknown',
            amount: pa.amount_cents / 100
          })) || [],
          progress_percentage: 50 // Would need to calculate from payments
        })) || [],
        impact_stories: stories || [],
        quarterly_receipt: receipt ? {
          id: receipt.id,
          period_start: receipt.period_start,
          period_end: receipt.period_end,
          total_given: receipt.total_given_cents / 100,
          projects_supported: receipt.projects_supported
        } : null
      }
    })
  } catch (error: any) {
    console.error('GET /api/my-impact error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
