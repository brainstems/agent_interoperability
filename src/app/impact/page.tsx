'use client'

import { useState, useEffect } from 'react'
import { 
  SparklesIcon,
  PlusIcon,
  HeartIcon,
  UserGroupIcon,
  ClockIcon,
  PhotoIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface ImpactStory {
  id: string
  title: string
  subtitle: string
  story_body: string
  story_type: string
  author_id: string
  featured_image_url: string
  lives_impacted: number
  financial_impact: number
  volunteer_hours: number
  is_public: boolean
  is_featured: boolean
  published_at: string
  tags: string[]
  ministry_areas: string[]
  created_at: string
}

export default function ImpactStoriesPage() {
  const [stories, setStories] = useState<ImpactStory[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    featured: 0,
    totalLivesImpacted: 0,
    totalVolunteerHours: 0
  })

  useEffect(() => {
    fetchStories()
  }, [filterType])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)

      const response = await fetch(`/api/impact-stories?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setStories(data.stories)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch impact stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case 'testimony': return 'bg-purple-100 text-purple-800'
      case 'ministry_update': return 'bg-blue-100 text-blue-800'
      case 'transformation_story': return 'bg-green-100 text-green-800'
      case 'volunteer_spotlight': return 'bg-orange-100 text-orange-800'
      case 'donor_impact': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStoryTypeIcon = (type: string) => {
    switch (type) {
      case 'testimony': return '✝️'
      case 'ministry_update': return '📰'
      case 'transformation_story': return '✨'
      case 'volunteer_spotlight': return '👥'
      case 'donor_impact': return '💝'
      default: return '📖'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impact Stories</h1>
          <p className="text-gray-600 mt-2">
            Share stories of transformation and ministry impact
          </p>
        </div>
        
        <button className="btn-primary flex items-center space-x-2">
          <PlusIcon className="h-5 w-5" />
          <span>Create Story</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Stories</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <SparklesIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Published</p>
              <p className="text-3xl font-bold mt-1">{stats.published}</p>
            </div>
            <EyeIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Lives Impacted</p>
              <p className="text-3xl font-bold mt-1">
                {stats.totalLivesImpacted.toLocaleString()}
              </p>
            </div>
            <HeartIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Volunteer Hours</p>
              <p className="text-3xl font-bold mt-1">
                {stats.totalVolunteerHours.toLocaleString()}
              </p>
            </div>
            <ClockIcon className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4 overflow-x-auto">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by type:</span>
          {['all', 'testimony', 'ministry_update', 'transformation_story', 'volunteer_spotlight', 'donor_impact'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filterType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </button>
          ))}
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
          <p className="text-gray-500 text-lg">No impact stories found</p>
          <p className="text-gray-400 text-sm mt-2">
            Create your first story to share the impact of your ministry
          </p>
          <button className="btn-primary mt-4">
            Create Impact Story
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer"
            >
              {/* Featured Image */}
              {story.featured_image_url ? (
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={story.featured_image_url}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {story.is_featured && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                      <SparklesIcon className="h-3 w-3" />
                      <span>Featured</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <PhotoIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStoryTypeColor(story.story_type)}`}>
                    <span className="mr-1">{getStoryTypeIcon(story.story_type)}</span>
                    {story.story_type.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  
                  {story.is_public && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <EyeIcon className="h-3 w-3 mr-1" />
                      Public
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {story.title}
                </h3>
                
                {story.subtitle && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {story.subtitle}
                  </p>
                )}

                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {story.story_body}
                </p>

                {/* Impact Metrics */}
                {(story.lives_impacted > 0 || story.financial_impact > 0 || story.volunteer_hours > 0) && (
                  <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-gray-200">
                    {story.lives_impacted > 0 && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Lives</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {story.lives_impacted}
                        </div>
                      </div>
                    )}
                    {story.financial_impact > 0 && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Impact</div>
                        <div className="text-lg font-semibold text-gray-900">
                          ${(story.financial_impact / 1000).toFixed(0)}k
                        </div>
                      </div>
                    )}
                    {story.volunteer_hours > 0 && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Hours</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {story.volunteer_hours}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {story.tags && story.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {story.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {story.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{story.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button className="flex-1 btn-secondary text-sm">
                    <PencilIcon className="h-4 w-4 mr-1 inline" />
                    Edit
                  </button>
                  <button className="btn-secondary text-sm">
                    <ShareIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
