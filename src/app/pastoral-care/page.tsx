'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  FunnelIcon, 
  HeartIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface PastoralCare {
  id: string
  memberId: string
  caregiverId: string
  careType: string
  reason: string
  notes?: string
  visitDate: string
  followUpNeeded: boolean
  followUpDate?: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  caregiver: {
    id: string
    email: string
  }
}

const careTypes = [
  'HOSPITAL_VISIT',
  'HOME_VISIT',
  'COUNSELING',
  'PRAYER_SUPPORT',
  'GRIEF_SUPPORT',
  'CRISIS_INTERVENTION',
  'SPIRITUAL_GUIDANCE',
  'COMMUNION'
]

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

export default function PastoralCarePage() {
  const [pastoralCare, setPastoralCare] = useState<PastoralCare[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCare, setSelectedCare] = useState<PastoralCare | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    careType: '',
    caregiverId: ''
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    thisWeek: 0,
    followUpNeeded: 0
  })

  useEffect(() => {
    fetchPastoralCare()
  }, [filters])

  const fetchPastoralCare = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/pastoral-care?${params}`)
      const result = await response.json()
      
      if (response.ok) {
        setPastoralCare(result.data)
        calculateStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching pastoral care:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (careData: PastoralCare[]) => {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const stats = {
      total: careData.length,
      scheduled: careData.filter(c => c.status === 'SCHEDULED').length,
      completed: careData.filter(c => c.status === 'COMPLETED').length,
      thisWeek: careData.filter(c => {
        const visitDate = new Date(c.visitDate)
        return visitDate >= weekStart && visitDate <= weekEnd
      }).length,
      followUpNeeded: careData.filter(c => c.followUpNeeded && c.status === 'COMPLETED').length
    }
    setStats(stats)
  }

  const updateCareStatus = async (careId: string, status: string) => {
    try {
      const response = await fetch('/api/pastoral-care', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: careId, status })
      })

      if (response.ok) {
        fetchPastoralCare()
      }
    } catch (error) {
      console.error('Error updating pastoral care:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pastoral Care</h1>
              <p className="mt-1 text-sm text-gray-500">
                Coordinate visits, counseling, and spiritual care for members
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Schedule Care
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HeartIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Care</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.scheduled}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Week</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.thisWeek}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Follow-up Needed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.followUpNeeded}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={filters.careType}
                  onChange={(e) => setFilters({...filters, careType: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Care Types</option>
                  {careTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>

                <div></div>

                <button
                  onClick={() => setFilters({ status: '', careType: '', caregiverId: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pastoral Care List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading pastoral care...</p>
            </div>
          ) : pastoralCare.length === 0 ? (
            <div className="p-8 text-center">
              <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pastoral care scheduled</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by scheduling care for a member.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pastoralCare.map((care) => (
                <li key={care.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {care.member.firstName} {care.member.lastName}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[care.status]}`}>
                          {care.status}
                        </span>
                        {care.followUpNeeded && care.status === 'COMPLETED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Follow-up Needed
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Type: {care.careType.replace(/_/g, ' ')}</span>
                        <span>Caregiver: {care.caregiver.email}</span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDateTime(care.visitDate)}
                        </span>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-600">
                        <strong>Reason:</strong> {care.reason}
                      </div>

                      {care.member.phone && (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {care.member.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {care.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => updateCareStatus(care.id, 'COMPLETED')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Complete
                          </button>
                          <button
                            onClick={() => updateCareStatus(care.id, 'CANCELLED')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedCare(care)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Care Details Modal */}
      {selectedCare && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Pastoral Care Details</h3>
                <button
                  onClick={() => setSelectedCare(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {selectedCare.member.firstName} {selectedCare.member.lastName}
                  </h4>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedCare.status]}`}>
                      {selectedCare.status}
                    </span>
                    {selectedCare.followUpNeeded && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Follow-up Needed
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Care Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCare.careType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Caregiver</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCare.caregiver.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Contact</label>
                  <div className="mt-1 text-sm text-gray-900">
                    <p>{selectedCare.member.email}</p>
                    {selectedCare.member.phone && <p>{selectedCare.member.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Care</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCare.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedCare.visitDate)}</p>
                  </div>
                  {selectedCare.followUpDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedCare.followUpDate)}</p>
                    </div>
                  )}
                </div>

                {selectedCare.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCare.notes}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedCare.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCare(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
