'use client'

import { useState, useEffect } from 'react'
import {
  SparklesIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  HeartIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface NBARecommendation {
  id: string
  member_id: string
  member_name: string
  action_type: string
  action_priority: number
  recommended_channel: string
  optimal_send_time: string
  reasoning: string
  confidence_score: number
  status: string
  created_at: string
  propensity_scores?: {
    give: number
    serve: number
    attend: number
  }
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<NBARecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    highPriority: 0,
    avgConfidence: 0,
    completed: 0
  })

  useEffect(() => {
    fetchRecommendations()
  }, [filterPriority, filterAction])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterPriority !== 'all') params.append('priority', filterPriority)
      if (filterAction !== 'all') params.append('action', filterAction)

      const response = await fetch(`/api/recommendations?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setRecommendations(data.recommendations)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeRecommendation = async (id: string) => {
    try {
      const response = await fetch(`/api/recommendations/${id}/execute`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchRecommendations()
      }
    } catch (error) {
      console.error('Failed to execute recommendation:', error)
    }
  }

  const dismissRecommendation = async (id: string) => {
    try {
      const response = await fetch(`/api/recommendations/${id}/dismiss`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchRecommendations()
      }
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'invite_to_serve':
      case 'invite_to_event':
        return <UserGroupIcon className="h-5 w-5" />
      case 'pledge_prompt':
      case 'recurring_ask':
      case 'upgrade_ask':
        return <HeartIcon className="h-5 w-5" />
      case 'thank_you':
      case 'personal_note':
        return <EnvelopeIcon className="h-5 w-5" />
      case 'phone_call':
      case 'pastoral_visit':
        return <PhoneIcon className="h-5 w-5" />
      default:
        return <LightBulbIcon className="h-5 w-5" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'invite_to_serve':
      case 'invite_to_event':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'pledge_prompt':
      case 'recurring_ask':
      case 'upgrade_ask':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'thank_you':
      case 'personal_note':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 're_engagement':
      case 'pastoral_visit':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />
      case 'sms': return <EnvelopeIcon className="h-4 w-4" />
      case 'phone': return <PhoneIcon className="h-4 w-4" />
      default: return <EnvelopeIcon className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">High</span>
    if (priority >= 5) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Medium</span>
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">Low</span>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SparklesIcon className="h-8 w-8 mr-3 text-primary-600" />
            AI Recommendations
          </h1>
          <p className="text-gray-600 mt-2">
            Personalized next-best actions powered by AI
          </p>
        </div>
        
        <button className="btn-secondary flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5" />
          <span>View Analytics</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Active Recommendations</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <LightBulbIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">High Priority</p>
              <p className="text-3xl font-bold mt-1">{stats.highPriority}</p>
            </div>
            <SparklesIcon className="h-12 w-12 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Avg Confidence</p>
              <p className="text-3xl font-bold mt-1">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority (8-10)</option>
              <option value="medium">Medium Priority (5-7)</option>
              <option value="low">Low Priority (1-4)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Type
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Actions</option>
              <option value="invite_to_serve">Invite to Serve</option>
              <option value="invite_to_event">Invite to Event</option>
              <option value="pledge_prompt">Pledge Prompt</option>
              <option value="recurring_ask">Recurring Ask</option>
              <option value="thank_you">Thank You</option>
              <option value="re_engagement">Re-engagement</option>
              <option value="pastoral_visit">Pastoral Visit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <LightBulbIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No recommendations available</p>
          <p className="text-gray-400 text-sm mt-2">
            Check back later for new AI-powered suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`bg-white rounded-lg shadow-sm border-2 ${
                rec.action_priority >= 8 ? 'border-red-300' : 'border-gray-200'
              } hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-3 rounded-lg border-2 ${getActionColor(rec.action_type)}`}>
                      {getActionIcon(rec.action_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rec.action_type.split('_').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </h3>
                        {getPriorityBadge(rec.action_priority)}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Member:</strong> {rec.member_name}
                      </p>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start space-x-2">
                          <LightBulbIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 mb-1">AI Reasoning</p>
                            <p className="text-sm text-blue-800">{rec.reasoning}</p>
                          </div>
                        </div>
                      </div>
                      
                      {rec.propensity_scores && (
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500">Propensity to Give</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {(rec.propensity_scores.give * 100).toFixed(0)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{ width: `${rec.propensity_scores.give * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Propensity to Serve</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {(rec.propensity_scores.serve * 100).toFixed(0)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${rec.propensity_scores.serve * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Propensity to Attend</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {(rec.propensity_scores.attend * 100).toFixed(0)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-purple-600 h-1.5 rounded-full"
                                style={{ width: `${rec.propensity_scores.attend * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          {getChannelIcon(rec.recommended_channel)}
                          <span className="capitalize">{rec.recommended_channel}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>
                            Best time: {new Date(rec.optimal_send_time).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ChartBarIcon className="h-4 w-4" />
                          <span>Confidence: {(rec.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => executeRecommendation(rec.id)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Execute</span>
                    </button>
                    <button
                      onClick={() => dismissRecommendation(rec.id)}
                      className="btn-secondary"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
