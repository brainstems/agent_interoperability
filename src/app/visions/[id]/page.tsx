'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  BookOpenIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlayIcon,
  CalendarIcon,
  CheckCircleIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

interface Vision {
  id: string
  title: string
  subtitle?: string
  horizon: string
  one_sentence_anchor?: string
  theological_basis_markdown: string
  narrative_markdown: string
  scripture_references: any[]
  faqs: any[]
  hero_image_url?: string
  video_url?: string
  status: string
  goals: VisionGoal[]
  campaigns: Campaign[]
}

interface VisionGoal {
  id: string
  goal_code: string
  name: string
  target_numeric: number
  unit: string
  current_value: number
  due_date?: string
}

interface Campaign {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

export default function VisionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [vision, setVision] = useState<Vision | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVision()
  }, [params.id])

  const fetchVision = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/visions/${params.id}`)
      const data = await response.json()
      
      if (data.success) {
        setVision(data.vision)
      }
    } catch (error) {
      console.error('Failed to fetch vision:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGoalProgress = (goal: VisionGoal) => {
    return Math.round((goal.current_value / goal.target_numeric) * 100)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!vision) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">Vision not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary-700 to-primary-900 text-white">
        {vision.hero_image_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${vision.hero_image_url})` }}
          />
        )}
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {vision.title}
            </h1>
            {vision.subtitle && (
              <p className="text-xl text-primary-100 mb-6">
                {vision.subtitle}
              </p>
            )}
            {vision.one_sentence_anchor && (
              <p className="text-2xl font-light italic mb-8 border-l-4 border-white pl-6">
                "{vision.one_sentence_anchor}"
              </p>
            )}
            
            {vision.video_url && (
              <button className="btn-primary bg-white text-primary-700 hover:bg-gray-100 inline-flex items-center space-x-2">
                <PlayIcon className="h-5 w-5" />
                <span>Watch Vision Video</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      {vision.status !== 'PUBLISHED' && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                This vision is in <strong>{vision.status}</strong> status and not yet public
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => router.push(`/visions/${vision.id}/edit`)}
                  className="btn-secondary text-sm"
                >
                  Edit
                </button>
                {vision.status === 'DRAFT' && (
                  <button className="btn-primary text-sm">
                    Submit for Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vision Narrative */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <BookOpenIcon className="h-6 w-6 mr-2 text-primary-600" />
                The Vision
              </h2>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: vision.narrative_markdown }}
              />
            </div>

            {/* Theological Foundation */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Theological Foundation
              </h3>
              <div 
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: vision.theological_basis_markdown }}
              />
              
              {vision.scripture_references.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Key Scriptures:</h4>
                  <div className="flex flex-wrap gap-2">
                    {vision.scripture_references.map((ref: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white text-blue-800 text-sm rounded-full border border-blue-300"
                      >
                        {ref.reference}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FAQs */}
            {vision.faqs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  {vision.faqs.map((faq: any, idx: number) => (
                    <details key={idx} className="group">
                      <summary className="cursor-pointer font-semibold text-gray-900 mb-2 flex items-center">
                        <span className="mr-2">▶</span>
                        {faq.question}
                      </summary>
                      <p className="text-gray-700 ml-6 mt-2">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Goals Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-primary-600" />
                Our Goals
              </h3>
              <div className="space-y-4">
                {vision.goals.map((goal) => {
                  const progress = getGoalProgress(goal)
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{goal.name}</div>
                          <div className="text-sm text-gray-600">
                            {goal.current_value.toLocaleString()} / {goal.target_numeric.toLocaleString()} {goal.unit}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-primary-700">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      {goal.due_date && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Due: {new Date(goal.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active Campaigns */}
            {vision.campaigns.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 mr-2 text-primary-600" />
                  Active Campaigns
                </h3>
                <div className="space-y-3">
                  {vision.campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                      </div>
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        {campaign.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-3">Ready to Join Us?</h3>
              <p className="text-primary-100 text-sm mb-4">
                Your gifts, time, and talents make this vision possible. Explore ways to participate.
              </p>
              <button 
                onClick={() => router.push(`/campaigns`)}
                className="w-full btn-primary bg-white text-primary-700 hover:bg-gray-100"
              >
                Choose Your Impact
              </button>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
                Resources
              </h3>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-primary-700 hover:text-primary-800 hover:underline">
                  Small Group Discussion Guide
                </a>
                <a href="#" className="block text-sm text-primary-700 hover:text-primary-800 hover:underline">
                  Family Conversation Prompts
                </a>
                <a href="#" className="block text-sm text-primary-700 hover:text-primary-800 hover:underline">
                  Prayer Guide
                </a>
                <a href="#" className="block text-sm text-primary-700 hover:text-primary-800 hover:underline">
                  Vision Video Transcript
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
