'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  HeartIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface MyImpactData {
  total_given_ytd: number
  total_given_lifetime: number
  projects_supported: number
  active_pledges: number
  recurring_pledges: number
  volunteer_hours: number
  impact_summary: {
    [key: string]: { value: number; unit: string }
  }
  recent_gifts: Gift[]
  active_pledges_list: Pledge[]
  impact_stories: Story[]
  quarterly_receipt?: Receipt
}

interface Gift {
  id: string
  amount: number
  date: string
  project_name: string
  fund_name: string
}

interface Pledge {
  id: string
  amount: number
  cadence: string
  start_date: string
  end_date?: string
  project_allocations: { project_name: string; amount: number }[]
  progress_percentage: number
}

interface Story {
  id: string
  title: string
  excerpt: string
  image_url?: string
  published_date: string
}

interface Receipt {
  id: string
  period_start: string
  period_end: string
  total_given: number
  projects_supported: any[]
}

export default function MyImpactPage() {
  const router = useRouter()
  const [data, setData] = useState<MyImpactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pledges' | 'history' | 'stories'>('overview')

  useEffect(() => {
    fetchImpactData()
  }, [])

  const fetchImpactData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/my-impact')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch impact data:', error)
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

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">Unable to load impact data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <HeartIcon className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Your Impact</h1>
            <p className="text-xl text-primary-100">
              See the difference your generosity is making
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 -mt-16">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Given This Year</span>
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${data.total_given_ytd.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Lifetime: ${data.total_given_lifetime.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Projects Supported</span>
              <SparklesIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.projects_supported}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Making impact across ministries
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Pledges</span>
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.active_pledges}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.recurring_pledges} recurring
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Volunteer Hours</span>
              <ClockIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.volunteer_hours}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Time & Talent given
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', label: 'Impact Overview' },
                { id: 'pledges', label: 'My Pledges' },
                { id: 'history', label: 'Giving History' },
                { id: 'stories', label: 'Impact Stories' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Impact Summary */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-primary-600" />
                  Your Impact This Year
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(data.impact_summary).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                      <div className="text-4xl font-bold text-green-700 mb-2">
                        {value.value.toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-green-900">
                        {value.unit}
                      </div>
                      <div className="text-xs text-green-800 mt-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Your generosity is making a real difference!</strong> These numbers represent real lives changed, families helped, and hope restored through your faithful giving.
                  </p>
                </div>
              </div>

              {/* Recent Gifts */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Gifts</h3>
                <div className="space-y-3">
                  {data.recent_gifts.slice(0, 5).map((gift) => (
                    <div key={gift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{gift.project_name}</div>
                        <div className="text-sm text-gray-600">{gift.fund_name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(gift.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-primary-700">
                        ${gift.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setSelectedTab('history')}
                  className="w-full mt-4 btn-secondary text-sm"
                >
                  View Full History
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quarterly Receipt */}
              {data.quarterly_receipt && (
                <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg p-6 text-white">
                  <div className="flex items-center mb-4">
                    <DocumentTextIcon className="h-6 w-6 mr-2" />
                    <h3 className="text-lg font-semibold">Quarterly Impact Receipt</h3>
                  </div>
                  <p className="text-primary-100 text-sm mb-4">
                    Your detailed impact report for{' '}
                    {new Date(data.quarterly_receipt.period_start).toLocaleDateString()} -{' '}
                    {new Date(data.quarterly_receipt.period_end).toLocaleDateString()}
                  </p>
                  <button className="w-full btn-primary bg-white text-primary-700 hover:bg-gray-100">
                    Download Receipt
                  </button>
                </div>
              )}

              {/* Give More CTA */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Continue Your Impact</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Explore current campaigns and find new ways to make a difference.
                </p>
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="w-full btn-primary"
                >
                  View Campaigns
                </button>
              </div>

              {/* Pledge Status */}
              {data.active_pledges > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Active Pledges</h3>
                  <div className="space-y-3">
                    {data.active_pledges_list.slice(0, 3).map((pledge) => (
                      <div key={pledge.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            ${pledge.amount} / {pledge.cadence}
                          </span>
                          <span className="text-xs text-green-600 font-semibold">
                            {pledge.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-600 h-1.5 rounded-full"
                            style={{ width: `${pledge.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setSelectedTab('pledges')}
                    className="w-full mt-4 text-sm text-primary-700 hover:text-primary-800 font-medium"
                  >
                    View All Pledges →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'pledges' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Pledges</h2>
            <div className="space-y-6">
              {data.active_pledges_list.map((pledge) => (
                <div key={pledge.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${pledge.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{pledge.cadence}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <CalendarIcon className="h-3 w-3 inline mr-1" />
                        Started {new Date(pledge.start_date).toLocaleDateString()}
                        {pledge.end_date && ` • Ends ${new Date(pledge.end_date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                      Active
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-900">{pledge.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-700 h-3 rounded-full transition-all"
                        style={{ width: `${pledge.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Allocations */}
                  {pledge.project_allocations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Project Allocation:</h4>
                      <div className="space-y-2">
                        {pledge.project_allocations.map((alloc, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{alloc.project_name}</span>
                            <span className="font-medium text-gray-900">${alloc.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                    <button className="btn-secondary text-sm">Edit Pledge</button>
                    <button className="btn-secondary text-sm">Pause</button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => router.push('/campaigns')}
              className="w-full mt-6 btn-primary"
            >
              Make a New Pledge
            </button>
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Giving History</h2>
              <button className="btn-secondary text-sm">Download Statement</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recent_gifts.map((gift) => (
                    <tr key={gift.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(gift.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{gift.project_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{gift.fund_name}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ${gift.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'stories' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Impact Stories</h2>
              <p className="text-gray-600">
                See the real-world impact of your generosity
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.impact_stories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/stories/${story.id}`)}
                >
                  {story.image_url && (
                    <img
                      src={story.image_url}
                      alt={story.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{story.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{story.excerpt}</p>
                    <div className="text-xs text-gray-500">
                      {new Date(story.published_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
