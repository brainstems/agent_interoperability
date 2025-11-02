'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOffice2Icon,
  FunnelIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface BenchmarkData {
  metric_name: string
  church_value: number
  org_average: number
  org_median: number
  percentile_rank: number
  trend: 'up' | 'down' | 'stable'
  comparison: 'above' | 'below' | 'at'
}

interface ChurchComparison {
  church_id: string
  church_name: string
  church_size: string
  metrics: BenchmarkData[]
}

export default function BenchmarkingPage() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([])
  const [comparisons, setComparisons] = useState<ChurchComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('quarterly')
  const [selectedSize, setSelectedSize] = useState('all')

  useEffect(() => {
    fetchBenchmarks()
  }, [selectedPeriod, selectedSize])

  const fetchBenchmarks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        period: selectedPeriod,
        size: selectedSize
      })

      const response = await fetch(`/api/benchmarking?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setBenchmarks(data.benchmarks)
        setComparisons(data.comparisons || [])
      }
    } catch (error) {
      console.error('Failed to fetch benchmarks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getComparisonColor = (comparison: string) => {
    switch (comparison) {
      case 'above': return 'text-green-600'
      case 'below': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
      case 'down': return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
      default: return <span className="text-gray-400">—</span>
    }
  }

  const formatMetricValue = (name: string, value: number) => {
    if (name.includes('rate') || name.includes('percentage')) {
      return `${(value * 100).toFixed(1)}%`
    } else if (name.includes('amount') || name.includes('gift')) {
      return `$${value.toLocaleString()}`
    } else if (name.includes('hours')) {
      return `${value.toLocaleString()}h`
    }
    return value.toLocaleString()
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'bg-green-100 text-green-800'
    if (percentile >= 50) return 'bg-blue-100 text-blue-800'
    if (percentile >= 25) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Benchmarking</h1>
          <p className="text-gray-600 mt-2">
            Compare your church's metrics with similar organizations
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <InformationCircleIcon className="h-5 w-5" />
          <span>All data is anonymized and opt-in</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Church Size
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Sizes</option>
              <option value="small">Small (&lt;100)</option>
              <option value="medium">Medium (100-500)</option>
              <option value="large">Large (500-2000)</option>
              <option value="mega">Mega (2000+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Benchmark Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {benchmarks.map((benchmark, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {benchmark.metric_name}
                  </h3>
                  {getTrendIcon(benchmark.trend)}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {formatMetricValue(benchmark.metric_name, benchmark.church_value)}
                  </div>
                  <div className={`text-sm font-medium ${getComparisonColor(benchmark.comparison)}`}>
                    {benchmark.comparison === 'above' && '↑ Above average'}
                    {benchmark.comparison === 'below' && '↓ Below average'}
                    {benchmark.comparison === 'at' && '→ At average'}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Organization Avg:</span>
                    <span className="font-medium">
                      {formatMetricValue(benchmark.metric_name, benchmark.org_average)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Median:</span>
                    <span className="font-medium">
                      {formatMetricValue(benchmark.metric_name, benchmark.org_median)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Percentile Rank</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPercentileColor(benchmark.percentile_rank)}`}>
                      {benchmark.percentile_rank}th
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${benchmark.percentile_rank}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Comparison Table */}
          {comparisons.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detailed Comparison
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Compare key metrics across similar churches
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Church
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participation Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Gift
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recurring %
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volunteer Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisons.map((church, index) => (
                      <tr key={church.church_id} className={index === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BuildingOffice2Icon className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {church.church_name}
                              </div>
                              {index === 0 && (
                                <div className="text-xs text-blue-600">Your Church</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                            {church.church_size}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {church.metrics.find(m => m.metric_name === 'participation_rate')
                            ? formatMetricValue('participation_rate', church.metrics.find(m => m.metric_name === 'participation_rate')!.church_value)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {church.metrics.find(m => m.metric_name === 'avg_gift')
                            ? formatMetricValue('avg_gift', church.metrics.find(m => m.metric_name === 'avg_gift')!.church_value)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {church.metrics.find(m => m.metric_name === 'recurring_rate')
                            ? formatMetricValue('recurring_rate', church.metrics.find(m => m.metric_name === 'recurring_rate')!.church_value)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {church.metrics.find(m => m.metric_name === 'volunteer_hours')
                            ? formatMetricValue('volunteer_hours', church.metrics.find(m => m.metric_name === 'volunteer_hours')!.church_value)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights & Recommendations */}
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Insights & Recommendations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Strong Participation Rate
                  </p>
                  <p className="text-sm text-gray-600">
                    Your church is in the 75th percentile for participation—keep up the great engagement strategies!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ↑
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Opportunity: Recurring Giving
                  </p>
                  <p className="text-sm text-gray-600">
                    Your recurring donor rate is below the median. Consider launching a recurring giving campaign.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  i
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Benchmark Context
                  </p>
                  <p className="text-sm text-gray-600">
                    These comparisons are based on {comparisons.length} similar-sized churches in your region.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
