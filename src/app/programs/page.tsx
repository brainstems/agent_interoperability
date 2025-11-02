'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  RocketLaunchIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'

interface StewardshipProgram {
  id: string
  name: string
  description: string
  program_type: string
  timeline_config: any
  content_pack: any
  kpi_targets: any
  liturgical_alignment: string
  is_published: boolean
  is_active: boolean
  organization_id: string
  organization_name?: string
  churches_using?: number
  avg_rating?: number
  created_at: string
}

export default function ProgramsLibraryPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<StewardshipProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [showPublished, setShowPublished] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [filterType, showPublished])

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)
      if (showPublished) params.append('published', 'true')

      const response = await fetch(`/api/programs?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setPrograms(data.programs)
      }
    } catch (error) {
      console.error('Failed to fetch programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const cloneProgram = async (programId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}/clone`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/programs/${data.program.id}/edit`)
      }
    } catch (error) {
      console.error('Failed to clone program:', error)
    }
  }

  const getProgramTypeIcon = (type: string) => {
    switch (type) {
      case 'annual_stewardship_drive': return '📊'
      case 'capital_campaign': return '🏗️'
      case 'planned_giving_month': return '📜'
      case 'volunteer_drive': return '👥'
      case 'commitment_sunday': return '🙏'
      case 'advent_appeal': return '🕯️'
      case 'lent_appeal': return '✝️'
      default: return '📋'
    }
  }

  const getProgramTypeColor = (type: string) => {
    switch (type) {
      case 'annual_stewardship_drive': return 'bg-blue-100 text-blue-800'
      case 'capital_campaign': return 'bg-purple-100 text-purple-800'
      case 'planned_giving_month': return 'bg-green-100 text-green-800'
      case 'volunteer_drive': return 'bg-orange-100 text-orange-800'
      case 'commitment_sunday': return 'bg-pink-100 text-pink-800'
      case 'advent_appeal': return 'bg-indigo-100 text-indigo-800'
      case 'lent_appeal': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatProgramType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Program Library</h1>
          <p className="text-gray-600 mt-2">
            Browse and clone proven stewardship program templates
          </p>
        </div>
        
        <button
          onClick={() => router.push('/programs/new')}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Program</span>
        </button>
      </div>

      {/* Featured Programs Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <SparklesIcon className="h-7 w-7 mr-2" />
              Featured Templates
            </h2>
            <p className="text-primary-100 mb-4">
              Proven programs from successful campaigns across our network
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <BuildingOffice2Icon className="h-5 w-5 mr-2" />
                <span>Used by 150+ churches</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                <span>ECFA-aligned best practices</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <RocketLaunchIcon className="h-24 w-24 text-primary-300" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by type:</span>
            {[
              'all',
              'annual_stewardship_drive',
              'capital_campaign',
              'planned_giving_month',
              'volunteer_drive',
              'commitment_sunday',
              'advent_appeal',
              'lent_appeal'
            ].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'All Programs' : formatProgramType(type)}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-2 ml-4">
            <input
              type="checkbox"
              checked={showPublished}
              onChange={(e) => setShowPublished(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 whitespace-nowrap">Published only</span>
          </label>
        </div>
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No programs found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your filters or create a new program
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Program Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{getProgramTypeIcon(program.program_type)}</span>
                  {program.is_published && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      Published
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {program.name}
                </h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getProgramTypeColor(program.program_type)}`}>
                  {formatProgramType(program.program_type)}
                </span>
              </div>

              {/* Program Content */}
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {program.description}
                </p>

                {/* Program Details */}
                <div className="space-y-2 mb-4">
                  {program.timeline_config?.weeks && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{program.timeline_config.weeks} week program</span>
                    </div>
                  )}

                  {program.liturgical_alignment && (
                    <div className="flex items-center text-sm text-gray-600">
                      <SparklesIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="capitalize">{program.liturgical_alignment}</span>
                    </div>
                  )}

                  {program.organization_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <BuildingOffice2Icon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{program.organization_name}</span>
                    </div>
                  )}
                </div>

                {/* Content Assets Preview */}
                {program.content_pack && Object.keys(program.content_pack).length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center text-xs text-blue-800 mb-2">
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      <span className="font-medium">Includes:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {program.content_pack.emails && (
                        <span className="px-2 py-1 bg-white text-blue-700 text-xs rounded">
                          Emails
                        </span>
                      )}
                      {program.content_pack.letters && (
                        <span className="px-2 py-1 bg-white text-blue-700 text-xs rounded">
                          Letters
                        </span>
                      )}
                      {program.content_pack.sermons && (
                        <span className="px-2 py-1 bg-white text-blue-700 text-xs rounded">
                          Sermons
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {program.churches_using !== undefined && (
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{program.churches_using} churches using</span>
                    {program.avg_rating && (
                      <span className="flex items-center">
                        ⭐ {program.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.push(`/programs/${program.id}`)}
                    className="flex-1 btn-secondary text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => cloneProgram(program.id)}
                    className="btn-primary text-sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1 inline" />
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Create Your Own Program
        </h2>
        <p className="text-gray-600 mb-6">
          Build a custom stewardship program from scratch with our program builder. 
          Define timelines, create content assets, and share with your network.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Set Timeline</h3>
              <p className="text-sm text-gray-600">
                Define program duration and key milestones
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Content</h3>
              <p className="text-sm text-gray-600">
                Create email templates, letters, and resources
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Share & Track</h3>
              <p className="text-sm text-gray-600">
                Publish for others and track success metrics
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/programs/new')}
          className="btn-primary mt-6"
        >
          Create New Program
        </button>
      </div>
    </div>
  )
}
