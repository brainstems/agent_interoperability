'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SparklesIcon,
  PlusIcon,
  FunnelIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface Story {
  id: string
  title: string
  subtitle?: string
  excerpt: string
  body_markdown: string
  story_type: string
  featured_image_url?: string
  status: string
  featured: boolean
  published_at?: string
  campaign?: {
    id: string
    name: string
  }
  vision?: {
    id: string
    title: string
  }
  impact_metrics?: Record<string, number>
  tags: string[]
}

export default function StoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchStories()
  }, [filterType, filterStatus])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const response = await fetch(`/api/stories?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setStories(data.stories)
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      REVIEW: 'bg-yellow-100 text-yellow-800',
      PUBLISHED: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || colors.DRAFT
  }

  const getTypeColor = (type: string) => {
    const colors = {
      testimony: 'bg-purple-100 text-purple-800',
      update: 'bg-blue-100 text-blue-800',
      milestone: 'bg-green-100 text-green-800',
      beneficiary: 'bg-pink-100 text-pink-800',
      impact: 'bg-orange-100 text-orange-800',
      celebration: 'bg-yellow-100 text-yellow-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SparklesIcon className="h-8 w-8 mr-3 text-primary-600" />
            Impact Stories
          </h1>
          <p className="text-gray-600 mt-2">
            Share testimonies and updates that inspire generosity
          </p>
        </div>
        
        <button
          onClick={() => router.push('/stories/new')}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Story</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stories.length}
          </div>
          <div className="text-sm text-gray-600">Total Stories</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-green-700 mb-1">
            {stories.filter(s => s.status === 'PUBLISHED').length}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-purple-700 mb-1">
            {stories.filter(s => s.featured).length}
          </div>
          <div className="text-sm text-gray-600">Featured</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-yellow-700 mb-1">
            {stories.filter(s => s.status === 'DRAFT').length}
          </div>
          <div className="text-sm text-gray-600">Drafts</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Filters:</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Story Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="testimony">Testimony</option>
              <option value="update">Update</option>
              <option value="milestone">Milestone</option>
              <option value="beneficiary">Beneficiary Story</option>
              <option value="impact">Impact Report</option>
              <option value="celebration">Celebration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">In Review</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SparklesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No stories found</p>
          <p className="text-gray-400 text-sm mb-6">
            Start sharing impact stories to inspire your community
          </p>
          <button
            onClick={() => router.push('/stories/new')}
            className="btn-primary"
          >
            Create First Story
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Image */}
              {story.featured_image_url && (
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={story.featured_image_url}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                  {story.featured && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                      ⭐ Featured
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Status & Type */}
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(story.status)}`}>
                    {story.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getTypeColor(story.story_type)}`}>
                    {story.story_type}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {story.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {story.excerpt}
                </p>

                {/* Context */}
                {(story.campaign || story.vision) && (
                  <div className="mb-4 text-xs text-gray-500 space-y-1">
                    {story.campaign && (
                      <div>Campaign: {story.campaign.name}</div>
                    )}
                    {story.vision && (
                      <div>Vision: {story.vision.title}</div>
                    )}
                  </div>
                )}

                {/* Impact Metrics */}
                {story.impact_metrics && Object.keys(story.impact_metrics).length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="text-xs font-semibold text-green-900 mb-2">Impact:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(story.impact_metrics).slice(0, 2).map(([key, value]) => (
                        <div key={key}>
                          <div className="text-lg font-bold text-green-700">{value}</div>
                          <div className="text-xs text-green-800 capitalize">{key.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {story.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {story.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Published Date */}
                {story.published_at && (
                  <div className="text-xs text-gray-500 mb-4">
                    Published {new Date(story.published_at).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {story.status === 'PUBLISHED' && (
                    <button
                      onClick={() => router.push(`/stories/${story.id}`)}
                      className="flex-1 btn-secondary text-sm flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/stories/${story.id}/edit`)}
                    className="flex-1 btn-secondary text-sm flex items-center justify-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  {story.status === 'PUBLISHED' && (
                    <button
                      onClick={() => {/* Share functionality */}}
                      className="btn-secondary text-sm p-2"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Best Practices for Impact Stories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-semibold">Be Specific</span>
            </div>
            <p>Use concrete numbers and real names (with consent) to make impact tangible.</p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-semibold">Show Transformation</span>
            </div>
            <p>Tell a before-and-after story that demonstrates real change.</p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-semibold">Include Photos</span>
            </div>
            <p>Visual storytelling is powerful. Use high-quality, permission-based images.</p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-semibold">Connect to Vision</span>
            </div>
            <p>Link stories to your broader vision and show how gifts make it real.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
