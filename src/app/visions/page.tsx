'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SparklesIcon,
  PlusIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Vision {
  id: string
  title: string
  subtitle?: string
  horizon: '6M' | '12M' | '24M' | '36M'
  one_sentence_anchor?: string
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  created_at: string
  published_at?: string
  goal_count?: number
  campaign_count?: number
}

export default function VisionsPage() {
  const router = useRouter()
  const [visions, setVisions] = useState<Vision[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchVisions()
  }, [filterStatus])

  const fetchVisions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const response = await fetch(`/api/visions?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setVisions(data.visions)
      }
    } catch (error) {
      console.error('Failed to fetch visions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      REVIEW: 'bg-yellow-100 text-yellow-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.DRAFT
  }

  const getHorizonLabel = (horizon: string) => {
    const labels = {
      '6M': '6 Months',
      '12M': '1 Year',
      '24M': '2 Years',
      '36M': '3 Years'
    }
    return labels[horizon as keyof typeof labels] || horizon
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SparklesIcon className="h-8 w-8 mr-3 text-primary-600" />
            Vision Studio
          </h1>
          <p className="text-gray-600 mt-2">
            Craft bold, theologically-grounded visions for your ministry
          </p>
        </div>
        
        <button
          onClick={() => router.push('/visions/new')}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Vision</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
        <div className="flex items-start space-x-4">
          <BookOpenIcon className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Vision-Driven Stewardship
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Build campaigns around compelling visions anchored in Scripture and theology. 
              Each vision includes measurable goals, impact models, and personalized communication sequences.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                <span>Theological grounding</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                <span>Measurable goals</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                <span>Impact calculator</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                <span>Story engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {['all', 'DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All Visions' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Visions Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : visions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SparklesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No visions found</p>
          <p className="text-gray-400 text-sm mb-6">
            Create your first vision to begin building faith-driven campaigns
          </p>
          <button
            onClick={() => router.push('/visions/new')}
            className="btn-primary"
          >
            Create First Vision
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visions.map((vision) => (
            <div
              key={vision.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/visions/${vision.id}`)}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(vision.status)}`}>
                    {vision.status}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {getHorizonLabel(vision.horizon)}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {vision.title}
                </h3>

                {vision.subtitle && (
                  <p className="text-sm text-gray-600 mb-2">
                    {vision.subtitle}
                  </p>
                )}

                {vision.one_sentence_anchor && (
                  <p className="text-sm text-primary-700 italic">
                    "{vision.one_sentence_anchor}"
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Goals</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {vision.goal_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Campaigns</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {vision.campaign_count || 0}
                    </div>
                  </div>
                </div>

                {vision.published_at && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    Published {new Date(vision.published_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex items-center space-x-2">
                {vision.status === 'PUBLISHED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(`/v/${vision.id}`, '_blank')
                    }}
                    className="flex-1 btn-secondary text-sm flex items-center justify-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Public
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/visions/${vision.id}/edit`)
                  }}
                  className="flex-1 btn-primary text-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Start Guide */}
      <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Creating a Vision: Quick Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold mb-3">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Ground in Scripture</h3>
            <p className="text-sm text-gray-600">
              Begin with theological foundation and biblical references that inspire the vision
            </p>
          </div>

          <div className="flex flex-col items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold mb-3">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Craft the Narrative</h3>
            <p className="text-sm text-gray-600">
              Write a compelling story about the future you're inviting people into
            </p>
          </div>

          <div className="flex flex-col items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold mb-3">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Define Goals</h3>
            <p className="text-sm text-gray-600">
              Set measurable targets (giving, volunteering, growth) with timelines
            </p>
          </div>

          <div className="flex flex-col items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold mb-3">
              4
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Launch Campaigns</h3>
            <p className="text-sm text-gray-600">
              Create projects, build communication sequences, and invite participation
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
