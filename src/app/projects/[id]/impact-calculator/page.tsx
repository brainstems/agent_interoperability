'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  CalculatorIcon,
  HeartIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  description: string
  impact_unit: string
  impact_per_100_dollars: number
  goal_cents: number
  raised_cents: number
  image_url?: string
}

interface ImpactResult {
  amount_cents: number
  impact_value: number
  impact_unit: string
  narrative: string
  examples: string[]
}

export default function ImpactCalculatorPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [amount, setAmount] = useState<number>(100)
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null)
  const [loading, setLoading] = useState(true)

  const presetAmounts = [25, 50, 100, 250, 500, 1000]

  useEffect(() => {
    fetchProject()
  }, [params.id])

  useEffect(() => {
    if (project) {
      calculateImpact()
    }
  }, [amount, project])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${params.id}`)
      const data = await response.json()
      
      if (data.success) {
        setProject(data.project)
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateImpact = async () => {
    if (!project) return

    try {
      const response = await fetch(`/api/projects/${params.id}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: amount * 100 })
      })
      const data = await response.json()
      
      if (data.success) {
        setImpactResult(data.impact)
      }
    } catch (error) {
      console.error('Failed to calculate impact:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">Project not found</p>
      </div>
    )
  }

  const progressPercentage = Math.round((project.raised_cents / project.goal_cents) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <CalculatorIcon className="h-8 w-8 text-primary-700" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Impact Calculator
          </h1>
          <p className="text-xl text-gray-600">
            See the tangible difference your giving makes
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Project Info */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
              {project.image_url && (
                <img
                  src={project.image_url}
                  alt={project.name}
                  className="w-full h-48 object-cover rounded-lg mb-6"
                />
              )}
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {project.name}
              </h2>
              
              <p className="text-gray-700 mb-6">
                {project.description}
              </p>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Campaign Progress</span>
                  <span className="font-semibold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-700 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>${(project.raised_cents / 100).toLocaleString()} raised</span>
                  <span>${(project.goal_cents / 100).toLocaleString()} goal</span>
                </div>
              </div>

              {/* Impact Model Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-blue-900 mb-2">
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Impact Model</span>
                </div>
                <p className="text-blue-800 text-sm">
                  Every $100 contributes approximately{' '}
                  <strong>{project.impact_per_100_dollars} {project.impact_unit}</strong> to this ministry.
                </p>
              </div>
            </div>

            {/* Calculator */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Calculate Your Impact
              </h3>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter Your Gift Amount
                </label>
                
                {/* Preset Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                        amount === preset
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Slider */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Custom Amount</span>
                    <span className="text-2xl font-bold text-primary-700">
                      ${amount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="5000"
                    step="10"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$10</span>
                    <span>$5,000</span>
                  </div>
                </div>

                {/* Direct Input */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    min="1"
                  />
                </div>
              </div>

              {/* Impact Result */}
              {impactResult && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
                  <div className="flex items-center mb-4">
                    <HeartIcon className="h-6 w-6 text-green-600 mr-2" />
                    <h4 className="text-lg font-semibold text-gray-900">Your Impact</h4>
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold text-green-700 mb-2">
                      {impactResult.impact_value.toLocaleString(undefined, {
                        maximumFractionDigits: 1
                      })}
                    </div>
                    <div className="text-xl text-green-800 font-semibold">
                      {impactResult.impact_unit}
                    </div>
                  </div>

                  <p className="text-green-900 text-center mb-4 leading-relaxed">
                    {impactResult.narrative}
                  </p>

                  {impactResult.examples && impactResult.examples.length > 0 && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        What this means:
                      </p>
                      <ul className="space-y-2">
                        {impactResult.examples.map((example, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <ArrowRightIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="mt-6">
                <button className="w-full btn-primary py-4 text-lg">
                  Make This Gift
                </button>
              </div>
            </div>
          </div>

          {/* Split Gift Option */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2 text-primary-600" />
              Split Your Gift Across Multiple Projects
            </h3>
            <p className="text-gray-600 mb-6">
              Want to make an even broader impact? You can divide your gift across multiple projects that matter to you.
            </p>
            <button className="btn-secondary">
              View All Projects
            </button>
          </div>

          {/* Transparency */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Our Commitment to Transparency
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
              <div>
                <div className="font-semibold text-primary-700 mb-2">Direct Impact</div>
                <p>95% of your gift goes directly to ministry programs and services.</p>
              </div>
              <div>
                <div className="font-semibold text-primary-700 mb-2">Quarterly Reports</div>
                <p>Receive detailed impact statements showing exactly where your money went.</p>
              </div>
              <div>
                <div className="font-semibold text-primary-700 mb-2">Tax Deductible</div>
                <p>All gifts are fully tax-deductible. Receipts provided immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
