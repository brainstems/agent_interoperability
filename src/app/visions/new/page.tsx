'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpenIcon,
  SparklesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface VisionFormData {
  title: string
  subtitle: string
  horizon: string
  one_sentence_anchor: string
  theological_basis_markdown: string
  narrative_markdown: string
  scripture_references: { book: string; chapter: number; verse: string; text: string }[]
  faqs: { question: string; answer: string }[]
  hero_image_url: string
  video_url: string
  small_group_guide_markdown: string
  youth_summary_markdown: string
  kids_summary_markdown: string
  leader_toolkit_markdown: string
}

export default function NewVisionPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<VisionFormData>({
    title: '',
    subtitle: '',
    horizon: '12M',
    one_sentence_anchor: '',
    theological_basis_markdown: '',
    narrative_markdown: '',
    scripture_references: [],
    faqs: [],
    hero_image_url: '',
    video_url: '',
    small_group_guide_markdown: '',
    youth_summary_markdown: '',
    kids_summary_markdown: '',
    leader_toolkit_markdown: ''
  })

  const steps = [
    { number: 1, title: 'Basic Info', icon: SparklesIcon },
    { number: 2, title: 'Theological Foundation', icon: BookOpenIcon },
    { number: 3, title: 'Narrative', icon: DocumentTextIcon },
    { number: 4, title: 'Resources', icon: CheckCircleIcon }
  ]

  const updateField = (field: keyof VisionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addScripture = () => {
    setFormData(prev => ({
      ...prev,
      scripture_references: [
        ...prev.scripture_references,
        { book: '', chapter: 1, verse: '', text: '' }
      ]
    }))
  }

  const updateScripture = (index: number, field: string, value: any) => {
    const updated = [...formData.scripture_references]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(prev => ({ ...prev, scripture_references: updated }))
  }

  const removeScripture = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scripture_references: prev.scripture_references.filter((_, i) => i !== index)
    }))
  }

  const addFAQ = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }))
  }

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...formData.faqs]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(prev => ({ ...prev, faqs: updated }))
  }

  const removeFAQ = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async (status: 'DRAFT' | 'REVIEW') => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/visions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status })
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/visions/${result.vision.id}`)
      } else {
        alert('Error saving vision: ' + result.error)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save vision')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Vision</h1>
          <p className="text-gray-600 mt-2">Build a theological foundation for your stewardship campaign</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                      currentStep >= step.number
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    currentStep >= step.number ? 'text-primary-700' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-4 ${
                    currentStep > step.number ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Vision Basics</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vision Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Neighbor by Name 2026"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">A compelling, memorable name for your vision</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => updateField('subtitle', e.target.value)}
                    placeholder="e.g., Loving our neighbors as ourselves"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Horizon *
                  </label>
                  <select
                    value={formData.horizon}
                    onChange={(e) => updateField('horizon', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="6M">6 Months</option>
                    <option value="12M">12 Months</option>
                    <option value="18M">18 Months</option>
                    <option value="24M">24 Months</option>
                    <option value="36M">36 Months</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">How long will this vision guide your ministry?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    One-Sentence Anchor *
                  </label>
                  <textarea
                    value={formData.one_sentence_anchor}
                    onChange={(e) => updateField('one_sentence_anchor', e.target.value)}
                    placeholder="A single, memorable sentence that captures the essence of this vision..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This will be prominently displayed everywhere - make it inspiring!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hero Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.hero_image_url}
                    onChange={(e) => updateField('hero_image_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vision Video URL (YouTube, Vimeo, etc.)
                  </label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => updateField('video_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Theological Foundation */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Theological Foundation</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theological Basis *
                  </label>
                  <textarea
                    value={formData.theological_basis_markdown}
                    onChange={(e) => updateField('theological_basis_markdown', e.target.value)}
                    placeholder="Ground this vision in Scripture, church tradition, and theological reflection..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Markdown supported. Explain the biblical and theological "why" behind this vision.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Scripture References
                    </label>
                    <button
                      onClick={addScripture}
                      className="btn-secondary text-sm"
                    >
                      + Add Scripture
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.scripture_references.map((ref, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-12 gap-3 mb-3">
                          <input
                            type="text"
                            value={ref.book}
                            onChange={(e) => updateScripture(idx, 'book', e.target.value)}
                            placeholder="Book"
                            className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="number"
                            value={ref.chapter}
                            onChange={(e) => updateScripture(idx, 'chapter', parseInt(e.target.value))}
                            placeholder="Ch"
                            className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            value={ref.verse}
                            onChange={(e) => updateScripture(idx, 'verse', e.target.value)}
                            placeholder="Verse"
                            className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => removeScripture(idx)}
                            className="col-span-2 text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          value={ref.text}
                          onChange={(e) => updateScripture(idx, 'text', e.target.value)}
                          placeholder="Paste the verse text here..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Narrative */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Vision Narrative</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Narrative *
                  </label>
                  <textarea
                    value={formData.narrative_markdown}
                    onChange={(e) => updateField('narrative_markdown', e.target.value)}
                    placeholder="Tell the full story of this vision. What will change? Who will be impacted? Why does this matter?"
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This is the heart of your vision. Write 500-1000 words that inspire and compel.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Frequently Asked Questions
                    </label>
                    <button
                      onClick={addFAQ}
                      className="btn-secondary text-sm"
                    >
                      + Add FAQ
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.faqs.map((faq, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFAQ(idx, 'question', e.target.value)}
                          placeholder="Question?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 font-semibold"
                        />
                        <textarea
                          value={faq.answer}
                          onChange={(e) => updateFAQ(idx, 'answer', e.target.value)}
                          placeholder="Answer..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                        />
                        <button
                          onClick={() => removeFAQ(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove FAQ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Resources */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Supporting Resources</h2>
                <p className="text-gray-600 mb-6">
                  Create materials to help your congregation engage with this vision.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Small Group Discussion Guide
                  </label>
                  <textarea
                    value={formData.small_group_guide_markdown}
                    onChange={(e) => updateField('small_group_guide_markdown', e.target.value)}
                    placeholder="Questions and activities for small group discussion..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Youth Summary
                  </label>
                  <textarea
                    value={formData.youth_summary_markdown}
                    onChange={(e) => updateField('youth_summary_markdown', e.target.value)}
                    placeholder="A version of this vision written for teenagers..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kids Summary
                  </label>
                  <textarea
                    value={formData.kids_summary_markdown}
                    onChange={(e) => updateField('kids_summary_markdown', e.target.value)}
                    placeholder="A simple explanation for children..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leader Toolkit
                  </label>
                  <textarea
                    value={formData.leader_toolkit_markdown}
                    onChange={(e) => updateField('leader_toolkit_markdown', e.target.value)}
                    placeholder="Resources, talking points, and tools for ministry leaders..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving}
                  className="btn-secondary"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>

                {currentStep < 4 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSave('REVIEW')}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Submitting...' : 'Submit for Review'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
