import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Get agent performance metrics
    const { data: metrics } = await supabase
      .from('agent_performance_metrics')
      .select('*')
      .eq('church_id', user.churchId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Get recent agent event logs
    const { data: recentLogs } = await supabase
      .from('agent_event_logs')
      .select('*')
      .eq('church_id', user.churchId)
      .order('processed_at', { ascending: false })
      .limit(50)

    // Calculate summary statistics
    const totalEvents = recentLogs?.length || 0
    const successfulEvents = recentLogs?.filter(log => log.status === 'completed').length || 0
    const failedEvents = recentLogs?.filter(log => log.status === 'error').length || 0
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0

    // Group by agent type
    const agentStats = recentLogs?.reduce((acc: any, log) => {
      if (!acc[log.agent_type]) {
        acc[log.agent_type] = { total: 0, successful: 0, failed: 0 }
      }
      acc[log.agent_type].total++
      if (log.status === 'completed') acc[log.agent_type].successful++
      if (log.status === 'error') acc[log.agent_type].failed++
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEvents,
          successfulEvents,
          failedEvents,
          successRate: Math.round(successRate * 100) / 100
        },
        agentStats,
        metrics: metrics || [],
        recentLogs: recentLogs?.slice(0, 10) || []
      }
    })

  } catch (error) {
    console.error('Agent performance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get performance data' },
      { status: 500 }
    )
  }
}
