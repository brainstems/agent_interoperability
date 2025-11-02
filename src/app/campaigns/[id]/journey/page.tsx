'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  PlusIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CodeBracketSquareIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface JourneyStep {
  id: string
  step_order: number
  step_name: string
  step_type: string
  ab_variant: string
  subject_line?: string
  message_content?: string
  communication_channel: string
  delay_type: string
  delay_value: number
  send_time?: string
  created_at: string
}

interface Journey {
  id: string
  name: string
  description: string
  journey_type: string
  is_active: boolean
  enable_ab_testing: boolean
  created_at: string
  steps: JourneyStep[]
  enrollments_count?: number
  completion_rate?: number
}

export default function JourneyDesignerPage() {
  const params = useParams()
  const campaignId = params.id as string
  
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStepModal, setShowStepModal] = useState(false)
  const [editingStep, setEditingStep] = useState<JourneyStep | null>(null)

  useEffect(() => {
    if (campaignId) {
      fetchJourneys()
    }
  }, [campaignId])

  const fetchJourneys = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/journeys`)
      const data = await response.json()
      
      if (data.success) {
        setJourneys(data.journeys)
        if (data.journeys.length > 0 && !selectedJourney) {
          setSelectedJourney(data.journeys[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'invite':
      case 'reminder':
      case 'thank_you':
        return <EnvelopeIcon className="h-5 w-5" />
      case 'pledge_prompt':
        return <CheckCircleIcon className="h-5 w-5" />
      case 'wait':
        return <ClockIcon className="h-5 w-5" />
      case 'branch':
        return <CodeBracketSquareIcon className="h-5 w-5" />
      default:
        return <ArrowRightIcon className="h-5 w-5" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <EnvelopeIcon className="h-4 w-4" />
      case 'sms':
        return <DevicePhoneMobileIcon className="h-4 w-4" />
      default:
        return <EnvelopeIcon className="h-4 w-4" />
    }
  }

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case 'invite': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'pledge_prompt': return 'bg-green-100 text-green-800 border-green-300'
      case 'thank_you': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'wait': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'branch': return 'bg-orange-100 text-orange-800 border-orange-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const renderJourneyFlow = (journey: Journey) => {
    if (!journey.steps || journey.steps.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <CodeBracketSquareIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No steps defined yet</p>
          <button
            onClick={() => setShowStepModal(true)}
            className="btn-primary mt-4"
          >
            Add First Step
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {journey.steps.sort((a, b) => a.step_order - b.step_order).map((step, index) => (
          <div key={step.id}>
            {/* Step Card */}
            <div className={`p-4 rounded-lg border-2 ${getStepColor(step.step_type)} hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {getStepIcon(step.step_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{step.step_name}</h4>
                      {step.ab_variant !== 'control' && (
                        <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                          Variant {step.ab_variant.toUpperCase()}
                        </span>
                      )}
                      <div className="flex items-center space-x-1 text-xs">
                        {getChannelIcon(step.communication_channel)}
                        <span className="capitalize">{step.communication_channel}</span>
                      </div>
                    </div>
                    
                    {step.subject_line && (
                      <p className="text-sm mt-1 font-medium">
                        {step.subject_line}
                      </p>
                    )}
                    
                    {step.message_content && (
                      <p className="text-sm mt-1 opacity-80 line-clamp-2">
                        {step.message_content}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      {step.delay_type !== 'immediate' && (
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            Wait {step.delay_value} {step.delay_type}
                          </span>
                        </span>
                      )}
                      {step.send_time && (
                        <span>
                          Send at: {step.send_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingStep(step)}
                    className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {/* Delete step */}}
                    className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-50 text-red-600"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Connector */}
            {index < journey.steps.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRightIcon className="h-6 w-6 text-gray-400 rotate-90" />
              </div>
            )}
          </div>
        ))}
        
        {/* Add Step Button */}
        <button
          onClick={() => setShowStepModal(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Step</span>
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Journey List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Journeys</h2>
              <button className="btn-primary-sm">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {journeys.map((journey) => (
                <button
                  key={journey.id}
                  onClick={() => setSelectedJourney(journey)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedJourney?.id === journey.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{journey.name}</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {journey.journey_type?.replace('_', ' ')}
                  </div>
                  {journey.enrollments_count !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {journey.enrollments_count} enrolled
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Journey Designer */}
        <div className="lg:col-span-3">
          {selectedJourney ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Journey Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedJourney.name}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {selectedJourney.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 mt-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedJourney.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedJourney.is_active ? 'Active' : 'Inactive'}
                      </span>
                      
                      {selectedJourney.enable_ab_testing && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          A/B Testing Enabled
                        </span>
                      )}
                      
                      {selectedJourney.completion_rate !== undefined && (
                        <span className="text-sm text-gray-600">
                          {selectedJourney.completion_rate}% completion rate
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="btn-secondary flex items-center space-x-2">
                      <ChartBarIcon className="h-4 w-4" />
                      <span>Analytics</span>
                    </button>
                    <button className={`btn-${selectedJourney.is_active ? 'secondary' : 'primary'} flex items-center space-x-2`}>
                      {selectedJourney.is_active ? (
                        <>
                          <PauseIcon className="h-4 w-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Journey Flow */}
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  renderJourneyFlow(selectedJourney)
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CodeBracketSquareIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Select a journey to edit</p>
              <p className="text-gray-400 text-sm mt-2">
                or create a new journey to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
