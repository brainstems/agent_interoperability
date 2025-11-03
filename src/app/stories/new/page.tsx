'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SparklesIcon,
  PhotoIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface StoryFormData {
  title: string
  subtitle: string
  story_type: string
  body_markdown: string
  excerpt: string
  featured_image_url: string
  media_url: string
  media_type: string
  tags: string[]
  impact_metrics: Record<string, number>
  campaign_id: string
  vision_id: string
  project_id: string
  consent_obtained: boolean
  consent_date: string
  author_name: string
}

export default function NewStoryPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [visions, setVisions] = useState<any[]>([])
  const [tagInput, setTagInput] = useState('')
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    subtitle: '',
    story_type: 'update',
    body_markdown: '',
    excerpt: '',
    featured_image_url: '',
    media_url: '',
    media_type: '',
    tags: [],
    impact_metrics: {},
    campaign_id: '',
    vision_id: '',
    project_id: '',
    consent_obtained: false,
    consent_date: '',
    author_name: ''
  })

  useEffect(() => {
    fetchCampaigns()
    fetchVisions()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      if (data.success) setCampaigns(data.campaigns)
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    }
  }

  const fetchVisions = async () => {
    try {
      const response = await fetch('/api/visions')
      const data = await response.json()
      if (data.success) setVisions(data.visions)
    } catch (error) {
      console.error('Failed to fetch visions:', error)
    }
  }

  const updateField = (field: keyof StoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addMetric = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      impact_metrics: { ...prev.impact_metrics, [key]: value }
    }))
  }

  const removeMetric = (key: string) => {
    const { [key]: _, ...rest } = formData.impact_metrics
    setFormData(prev => ({ ...prev, impact_metrics: rest }))
  }

  const handleSave = async (status: 'DRAFT' | 'REVIEW' | 'PUBLISHED') => {
    try {
      setSaving(true)

      // Generate excerpt if not provided
      const excerpt = formData.excerpt || formData.body_markdown.substring(0, 200)

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, excerpt, status })
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/stories`)
      } else {
        alert('Error saving story: ' + result.error)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save story')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Stories
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Impact Story</h1>
          <p className="text-gray-600 mt-2">Share how your ministry is making a difference</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
              
              {/* Basic Info */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Story Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Story Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Give your story a compelling title"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => updateField('subtitle', e.target.value)}
                      placeholder="Optional subtitle"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Story Type *
                    </label>
                    <select
                      value={formData.story_type}
                      onChange={(e) => updateField('story_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="testimony">Testimony</option>
                      <option value="update">Update</option>
                      <option value="milestone">Milestone</option>
                      <option value="beneficiary">Beneficiary Story</option>
                      <option value="impact">Impact Report</option>
                      <option value="celebration">Celebration</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Story Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Content *
                </label>
                <textarea
                  value={formData.body_markdown}
                  onChange={(e) => updateField('body_markdown', e.target.value)}
                  placeholder="Write your story here. Markdown is supported for formatting..."
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Use markdown for formatting: **bold**, *italic*, # Heading, - bullet points
                </p>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt (Preview Text)
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                  placeholder="A short summary (auto-generated if left blank)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Media */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Featured Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.featured_image_url}
                      onChange={(e) => updateField('featured_image_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {formData.featured_image_url && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <img
                        src={formData.featured_image_url}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.png'
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Media URL (Video, Audio)
                    </label>
                    <input
                      type="url"
                      value={formData.media_url}
                      onChange={(e) => updateField('media_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {formData.media_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Media Type
                      </label>
                      <select
                        value={formData.media_type}
                        onChange={(e) => updateField('media_type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select type</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Consent */}
              {formData.story_type === 'beneficiary' && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficiary Consent</h3>
                  
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={formData.consent_obtained}
                      onChange={(e) => updateField('consent_obtained', e.target.checked)}
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      I have obtained written consent from the beneficiary to share their story
                    </label>
                  </div>

                  {formData.consent_obtained && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Consent Date
                      </label>
                      <input
                        type="date"
                        value={formData.consent_date}
                        onChange={(e) => updateField('consent_date', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Context */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Context</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Related Vision
                  </label>
                  <select
                    value={formData.vision_id}
                    onChange={(e) => updateField('vision_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">None</option>
                    {visions.map(v => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Related Campaign
                  </label>
                  <select
                    value={formData.campaign_id}
                    onChange={(e) => updateField('campaign_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">None</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={addTag}
                  className="btn-secondary text-sm"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full flex items-center space-x-2"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Metrics</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add quantifiable impact data (e.g., "families_helped": 12)
              </p>

              <div className="space-y-3">
                {Object.entries(formData.impact_metrics).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                    />
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => addMetric(key, parseFloat(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeMetric(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const key = prompt('Metric name (e.g., families_helped):')
                    const value = prompt('Value:')
                    if (key && value) addMetric(key, parseFloat(value))
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  + Add Metric
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-3">
                <button
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving || !formData.title || !formData.body_markdown}
                  className="w-full btn-secondary"
                >
                  Save as Draft
                </button>
                
                <button
                  onClick={() => handleSave('REVIEW')}
                  disabled={saving || !formData.title || !formData.body_markdown}
                  className="w-full btn-secondary"
                >
                  Submit for Review
                </button>

                <button
                  onClick={() => handleSave('PUBLISHED')}
                  disabled={saving || !formData.title || !formData.body_markdown}
                  className="w-full btn-primary"
                >
                  {saving ? 'Publishing...' : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
