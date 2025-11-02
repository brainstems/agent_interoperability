'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MegaphoneIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'

interface Campaign {
  id: string
  name: string
  description: string
  campaign_type: string
  start_date: string
  end_date: string
  commitment_date: string
  status: string
  goal_amount: number
  actual_amount: number
  goal_participants: number
  actual_participants: number
  liturgical_season: string
  created_at: string
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalRaised: 0,
    totalParticipants: 0
  })

  useEffect(() => {
    fetchCampaigns()
  }, [filterStatus])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const response = await fetch(`/api/campaigns?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setCampaigns(data.campaigns)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-yellow-100 text-yellow-800'
      case 'paused': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'stewardship_drive': return '🎯'
      case 'capital_campaign': return '🏗️'
      case 'volunteer_drive': return '👥'
      case 'advent_campaign': return '🕯️'
      case 'lent_campaign': return '✝️'
      default: return '📢'
    }
  }

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.goal_amount > 0) {
      return Math.min((campaign.actual_amount / campaign.goal_amount) * 100, 100)
    }
    return 0
  }

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-2">
            Manage stewardship campaigns and track progress
          </p>
        </div>
        
        <button
          onClick={() => router.push('/campaigns/new')}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Active Campaigns</p>
              <p className="text-3xl font-bold mt-1">{stats.active}</p>
            </div>
            <MegaphoneIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Raised</p>
              <p className="text-3xl font-bold mt-1">
                ${stats.totalRaised.toLocaleString()}
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Participants</p>
              <p className="text-3xl font-bold mt-1">{stats.totalParticipants}</p>
            </div>
            <UsersIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          {['all', 'planning', 'active', 'completed', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <MegaphoneIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No campaigns found</p>
          <p className="text-gray-400 text-sm mt-2">
            Create your first campaign to start engaging your community
          </p>
          <button
            onClick={() => router.push('/campaigns/new')}
            className="btn-primary mt-4"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => {
            const progress = calculateProgress(campaign)
            const daysRemaining = calculateDaysRemaining(campaign.end_date)
            
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              >
                <div className="p-6">
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-3xl">
                        {getCampaignTypeIcon(campaign.campaign_type)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {campaign.description}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {campaign.goal_amount > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">
                          ${campaign.actual_amount.toLocaleString()} raised
                        </span>
                        <span className="text-gray-600">
                          ${campaign.goal_amount.toLocaleString()} goal
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-primary-600 h-3 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-1">
                        {progress.toFixed(1)}% of goal
                      </p>
                    </div>
                  )}

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <UsersIcon className="h-4 w-4 mr-1" />
                        Participants
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {campaign.actual_participants}
                        {campaign.goal_participants > 0 && (
                          <span className="text-sm text-gray-500 font-normal">
                            /{campaign.goal_participants}
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Duration
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center text-gray-500 text-xs mb-1">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Remaining
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {daysRemaining > 0 ? `${daysRemaining}d` : 'Ended'}
                      </p>
                    </div>
                  </div>

                  {/* Campaign Dates */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-500">Start: </span>
                        <span className="text-gray-900 font-medium">
                          {new Date(campaign.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      {campaign.commitment_date && (
                        <div>
                          <span className="text-gray-500">Commitment: </span>
                          <span className="text-gray-900 font-medium">
                            {new Date(campaign.commitment_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">End: </span>
                        <span className="text-gray-900 font-medium">
                          {new Date(campaign.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/campaigns/${campaign.id}/journey`)
                      }}
                      className="flex-1 btn-secondary text-sm"
                    >
                      Journeys
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/campaigns/${campaign.id}/analytics`)
                      }}
                      className="flex-1 btn-secondary text-sm"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1 inline" />
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
