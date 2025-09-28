'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { automatedWorkflowEngine } from '@/lib/automated-workflows'
import { churchEventMonitor } from '@/lib/event-monitoring'
import { 
  PlayIcon, 
  PauseIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  HeartIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'

interface WorkflowExecution {
  id: string
  agent_name: string
  task_description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  started_at?: string
  completed_at?: string
  result?: any
  error?: string
  metadata: any
}

interface AgentStats {
  total_executions: number
  completed: number
  failed: number
  pending: number
  running: number
  avg_execution_time: number
}

const AGENT_CATEGORIES = {
  'Member Retention & Engagement': {
    icon: UserGroupIcon,
    color: 'blue',
    agents: [
      'inactivity_alert_agent',
      'milestone_celebration_agent',
      'volunteer_dropout_detector',
      'newcomer_onboarding_agent',
      'at_risk_member_identifier',
      'life_event_tracker_agent',
      'interest_affinity_mapper'
    ]
  },
  'Donation & Stewardship': {
    icon: CurrencyDollarIcon,
    color: 'green',
    agents: [
      'lapsed_donor_reengagement_agent',
      'first_time_donor_journey_agent',
      'major_gift_risk_alert_agent',
      'giving_season_optimizer_agent',
      'matching_gift_campaign_agent',
      'generosity_story_agent'
    ]
  },
  'Worship & Attendance': {
    icon: HeartIcon,
    color: 'purple',
    agents: [
      'recurring_absence_monitor_agent',
      'seasonal_attendance_pattern_agent',
      'special_event_invitation_agent',
      'holy_day_surge_planner_agent'
    ]
  },
  'Communications & Digital': {
    icon: EnvelopeIcon,
    color: 'indigo',
    agents: [
      'email_dropoff_detector_agent',
      'high_interest_click_tracker_agent',
      'content_sharing_encourager_agent',
      'silent_subscriber_outreach_agent',
      'event_followup_agent'
    ]
  },
  'Strategic Leadership': {
    icon: ChartPieIcon,
    color: 'amber',
    agents: [
      'board_dashboard_agent',
      'program_risk_notifier_agent',
      'opportunity_scan_agent',
      'mission_drift_detector_agent'
    ]
  }
}

export default function AutomatedAgentMonitor() {
  const { user, profile } = useAuth()
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const supabase = createClient()

  useEffect(() => {
    if (profile?.church_id) {
      loadExecutions()
      loadAgentStats()
      checkMonitoringStatus()
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('automated_executions')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'crewai_executions',
            filter: `church_id=eq.${profile.church_id}`
          }, 
          () => {
            loadExecutions()
            loadAgentStats()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [profile?.church_id])

  const loadExecutions = async () => {
    if (!profile?.church_id) return

    try {
      const { data, error } = await supabase
        .from('crewai_executions')
        .select('*')
        .eq('church_id', profile.church_id)
        .eq('metadata->>automated', 'true')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setExecutions(data || [])
    } catch (error) {
      console.error('Error loading executions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgentStats = async () => {
    if (!profile?.church_id) return

    try {
      const { data, error } = await supabase
        .rpc('get_agent_stats', { church_id_param: profile.church_id })

      if (error) throw error
      
      const statsMap: Record<string, AgentStats> = {}
      data?.forEach((stat: any) => {
        statsMap[stat.agent_name] = stat
      })
      setAgentStats(statsMap)
    } catch (error) {
      console.error('Error loading agent stats:', error)
    }
  }

  const checkMonitoringStatus = async () => {
    // This would check if automated monitoring is currently running
    // For now, we'll simulate this
    setIsMonitoring(false)
  }

  const toggleMonitoring = async () => {
    if (!profile?.church_id) return

    try {
      if (isMonitoring) {
        automatedWorkflowEngine.stopMonitoring()
        setIsMonitoring(false)
      } else {
        await automatedWorkflowEngine.startMonitoring(profile.church_id, 15) // 15 minute intervals
        setIsMonitoring(true)
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error)
    }
  }

  const runTestTriggers = async () => {
    if (!profile?.church_id) return

    setLoading(true)
    const results: Record<string, any> = {}

    try {
      // Test member inactivity detection
      const inactivityTest = await churchEventMonitor.checkSpecificTrigger(
        'Member Inactivity Alert',
        { memberId: 'test-member-1', churchId: profile.church_id }
      )
      results.inactivity = inactivityTest

      // Test lapsed donor detection
      const donorTest = await churchEventMonitor.checkSpecificTrigger(
        'Lapsed Donor Alert',
        { memberId: 'test-member-2', churchId: profile.church_id }
      )
      results.lapsed_donor = donorTest

      // Test newcomer onboarding
      const newcomerTest = await churchEventMonitor.checkSpecificTrigger(
        'Newcomer Onboarding',
        { memberId: 'test-member-3', churchId: profile.church_id, activityType: 'first_visit' }
      )
      results.newcomer = newcomerTest

      setTestResults(results)
    } catch (error) {
      console.error('Error running test triggers:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerManualWorkflow = async (agentName: string) => {
    if (!profile?.church_id) return

    try {
      const executionId = await automatedWorkflowEngine.triggerWorkflowForMember(
        agentName,
        'test-member-manual',
        profile.church_id,
        { manual_test: true, test_timestamp: new Date().toISOString() }
      )
      
      console.log(`Triggered manual workflow: ${executionId}`)
      await loadExecutions()
    } catch (error) {
      console.error('Error triggering manual workflow:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredExecutions = executions.filter(execution => {
    if (selectedAgent !== 'all' && execution.agent_name !== selectedAgent) {
      return false
    }
    
    if (selectedCategory !== 'All') {
      const categoryAgents = AGENT_CATEGORIES[selectedCategory as keyof typeof AGENT_CATEGORIES]?.agents || []
      if (!categoryAgents.includes(execution.agent_name)) {
        return false
      }
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automated Agent Monitor</h2>
          <p className="text-gray-600">Monitor and manage automated church management workflows</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={runTestTriggers}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Test Triggers
          </button>
          
          <button
            onClick={toggleMonitoring}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isMonitoring 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isMonitoring ? (
              <>
                <PauseIcon className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </button>
        </div>
      </div>

      {/* Agent Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(AGENT_CATEGORIES).map(([category, config]) => {
          const Icon = config.icon
          const categoryStats = config.agents.reduce((acc, agentName) => {
            const stats = agentStats[agentName]
            if (stats) {
              acc.total += stats.total_executions
              acc.completed += stats.completed
              acc.failed += stats.failed
            }
            return acc
          }, { total: 0, completed: 0, failed: 0 })

          return (
            <div
              key={category}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedCategory === category
                  ? `border-${config.color}-500 bg-${config.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category ? 'All' : category)}
            >
              <div className="flex items-center">
                <Icon className={`h-8 w-8 text-${config.color}-600 mr-3`} />
                <div>
                  <h3 className="font-medium text-gray-900">{category}</h3>
                  <p className="text-sm text-gray-600">
                    {categoryStats.total} executions • {categoryStats.completed} completed
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Test Results</h3>
          <div className="space-y-2">
            {Object.entries(testResults).map(([test, result]) => (
              <div key={test} className="flex items-center justify-between">
                <span className="text-sm text-blue-800">{test}:</span>
                <span className={`text-sm font-medium ${
                  result?.triggered ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {result?.triggered ? 'Triggered' : 'No trigger'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Agents</option>
          {Object.entries(AGENT_CATEGORIES).map(([category, config]) =>
            config.agents.map(agent => (
              <option key={agent} value={agent}>
                {agent.replace(/_/g, ' ').replace(/agent$/, '').trim()}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Executions List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Automated Executions ({filteredExecutions.length})
          </h3>
          
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No executions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start monitoring to see automated agent executions here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExecutions.map((execution) => (
                <div
                  key={execution.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {execution.agent_name.replace(/_/g, ' ').replace(/agent$/, '').trim()}
                        </h4>
                        <p className="text-sm text-gray-600">{execution.task_description}</p>
                        {execution.metadata?.memberId && (
                          <p className="text-xs text-gray-500">
                            Member: {execution.metadata.member_name || execution.metadata.memberId}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(execution.priority)}`}>
                        {execution.priority}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(execution.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {execution.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Error: {execution.error}
                    </div>
                  )}
                  
                  {execution.result && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      Completed successfully
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Test Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => triggerManualWorkflow('inactivity_alert_agent')}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Test Inactivity Alert
            </button>
            <button
              onClick={() => triggerManualWorkflow('newcomer_onboarding_agent')}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Test Newcomer Flow
            </button>
            <button
              onClick={() => triggerManualWorkflow('lapsed_donor_reengagement_agent')}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Test Donor Re-engagement
            </button>
            <button
              onClick={() => triggerManualWorkflow('milestone_celebration_agent')}
              className="p-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Test Milestone Celebration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
