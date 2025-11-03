'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  BookOpenIcon,
  ChartBarIcon,
  PlayIcon,
  HeartIcon,
  CalendarIcon,
  UsersIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface PublicVision {
  id: string
  title: string
  subtitle?: string
  one_sentence_anchor?: string
  narrative_markdown: string
  hero_image_url?: string
  video_url?: string
  goals: Goal[]
  campaigns: Campaign[]
  featured_stories: Story[]
  faqs: FAQ[]
}

interface Goal {
  name: string
  target_numeric: number
  current_value: number
  unit: string
  due_date?: string
}

interface Campaign {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  public_url_slug: string
}

interface Story {
  id: string
  title: string
  excerpt: string
  image_url?: string
}

interface FAQ {
  question: string
  answer: string
}

export default function PublicVisionPage() {
  const params = useParams()
  const router = useRouter()
  const [vision, setVision] = useState<PublicVision | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    fetchVision()
  }, [params.slug])

  const fetchVision = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/visions/public/${params.slug}`)
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

  const getGoalProgress = (goal: Goal) => {
    return Math.round((goal.current_value / goal.target_numeric) * 100)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        {vision.hero_image_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${vision.hero_image_url})` }}
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
              {vision.title}
            </h1>
            
            {vision.subtitle && (
              <p className="text-2xl md:text-3xl text-primary-100 mb-8 font-light">
                {vision.subtitle}
              </p>
            )}
            
            {vision.one_sentence_anchor && (
              <div className="max-w-3xl mx-auto mb-10">
                <p className="text-xl md:text-2xl italic border-l-4 border-white pl-6 py-4 bg-black/20 rounded-r-lg">
                  "{vision.one_sentence_anchor}"
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {vision.video_url && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="btn-primary bg-white text-primary-700 hover:bg-gray-100 px-8 py-4 text-lg inline-flex items-center space-x-2"
                >
                  <PlayIcon className="h-6 w-6" />
                  <span>Watch Vision Video</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  document.getElementById('goals')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="btn-primary bg-primary-500 hover:bg-primary-600 px-8 py-4 text-lg inline-flex items-center space-x-2"
              >
                <HeartIcon className="h-6 w-6" />
                <span>Get Involved</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowRightIcon className="h-6 w-6 rotate-90" />
        </div>
      </div>

      {/* Vision Narrative */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <BookOpenIcon className="h-8 w-8 text-primary-600 mr-3" />
              <h2 className="text-3xl font-bold text-gray-900">The Vision</h2>
            </div>
            
            <div 
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: vision.narrative_markdown }}
            />
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div id="goals" className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <ChartBarIcon className="h-8 w-8 text-primary-600 mr-3" />
              <h2 className="text-3xl font-bold text-gray-900">Our Goals</h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Measurable targets that bring this vision to life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {vision.goals.map((goal, idx) => {
              const progress = getGoalProgress(goal)
              return (
                <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-primary-700 mb-2">
                      {goal.current_value.toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-sm">
                      of {goal.target_numeric.toLocaleString()} {goal.unit}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
                    {goal.name}
                  </h3>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-bold text-primary-700">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-700 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {goal.due_date && (
                    <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Target: {new Date(goal.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active Campaigns */}
      {vision.campaigns.length > 0 && (
        <div className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <UsersIcon className="h-8 w-8 text-primary-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900">Ways to Participate</h2>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose how you want to make an impact
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {vision.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => router.push(`/campaigns/${campaign.public_url_slug || campaign.id}`)}
                >
                  <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">{campaign.name}</h3>
                    <p className="text-primary-100 text-sm">
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-gray-700 mb-6">{campaign.description}</p>
                    <button className="w-full btn-primary">
                      Learn More & Give
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Stories */}
      {vision.featured_stories.length > 0 && (
        <div className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <SparklesIcon className="h-8 w-8 text-primary-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900">Impact Stories</h2>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                See how this vision is already changing lives
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {vision.featured_stories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => router.push(`/stories/${story.id}`)}
                >
                  {story.image_url && (
                    <img
                      src={story.image_url}
                      alt={story.title}
                      className="w-full h-56 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{story.title}</h3>
                    <p className="text-gray-600 line-clamp-3">{story.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQs */}
      {vision.faqs.length > 0 && (
        <div className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4">
                {vision.faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-gray-50 rounded-lg border border-gray-200 p-6 hover:bg-gray-100 transition-colors"
                  >
                    <summary className="cursor-pointer font-semibold text-gray-900 flex items-center">
                      <span className="mr-3 text-primary-600 group-open:rotate-90 transition-transform">▶</span>
                      {faq.question}
                    </summary>
                    <p className="text-gray-700 mt-4 ml-8 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Join Us?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Your participation—whether through giving, serving, or praying—brings this vision closer to reality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/campaigns')}
              className="btn-primary bg-white text-primary-700 hover:bg-gray-100 px-8 py-4 text-lg"
            >
              Make a Gift
            </button>
            <button
              onClick={() => router.push('/volunteer')}
              className="btn-primary bg-primary-500 hover:bg-primary-600 px-8 py-4 text-lg border-2 border-white"
            >
              Volunteer
            </button>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && vision.video_url && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-5xl aspect-video">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl"
            >
              ✕ Close
            </button>
            <iframe
              src={vision.video_url}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  )
}
