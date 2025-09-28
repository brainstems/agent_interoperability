'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  FunnelIcon, 
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CalendarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface ContactHistory {
  id: string
  memberId: string
  contactedById: string
  contactType: 'PHONE_CALL' | 'EMAIL' | 'TEXT_MESSAGE' | 'IN_PERSON_VISIT' | 'VIDEO_CALL' | 'LETTER'
  subject?: string
  notes: string
  outcome?: string
  followUpDate?: string
  contactDate: string
  createdAt: string
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  contactedBy: {
    id: string
    email: string
  }
}

const contactTypes = [
  'PHONE_CALL',
  'EMAIL',
  'TEXT_MESSAGE',
  'IN_PERSON_VISIT',
  'VIDEO_CALL',
  'LETTER'
]

const contactTypeIcons = {
  PHONE_CALL: PhoneIcon,
  EMAIL: EnvelopeIcon,
  TEXT_MESSAGE: ChatBubbleLeftRightIcon,
  IN_PERSON_VISIT: UserGroupIcon,
  VIDEO_CALL: EyeIcon,
  LETTER: EnvelopeIcon
}

const contactTypeColors = {
  PHONE_CALL: 'bg-blue-100 text-blue-800',
  EMAIL: 'bg-green-100 text-green-800',
  TEXT_MESSAGE: 'bg-purple-100 text-purple-800',
  IN_PERSON_VISIT: 'bg-orange-100 text-orange-800',
  VIDEO_CALL: 'bg-indigo-100 text-indigo-800',
  LETTER: 'bg-gray-100 text-gray-800'
}

export default function ContactHistoryPage() {
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactHistory | null>(null)
  const [filters, setFilters] = useState({
    memberId: '',
    contactType: '',
    contactedById: '',
    startDate: '',
    endDate: ''
  })

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    followUpsNeeded: 0,
    byType: {} as Record<string, number>
  })

  useEffect(() => {
    fetchContactHistory()
  }, [filters])

  const fetchContactHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/contact-history?${params}`)
      const result = await response.json()
      
      if (response.ok) {
        setContactHistory(result.data)
        calculateStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching contact history:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (contactData: ContactHistory[]) => {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const byType: Record<string, number> = {}
    contactTypes.forEach(type => {
      byType[type] = contactData.filter(c => c.contactType === type).length
    })

    const stats = {
      total: contactData.length,
      thisWeek: contactData.filter(c => new Date(c.contactDate) >= weekStart).length,
      thisMonth: contactData.filter(c => new Date(c.contactDate) >= monthStart).length,
      followUpsNeeded: contactData.filter(c => 
        c.followUpDate && new Date(c.followUpDate) <= now
      ).length,
      byType
    }
    setStats(stats)
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

  const getContactTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contact History</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track all interactions with members and visitors
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Log Contact
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
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
                  <CalendarIcon className="h-6 w-6 text-blue-400" />
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
                  <CalendarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.thisMonth}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Follow-ups Due</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.followUpsNeeded}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Type Breakdown */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Contact Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {contactTypes.map(type => {
                const Icon = contactTypeIcons[type as keyof typeof contactTypeIcons]
                return (
                  <div key={type} className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{stats.byType[type] || 0}</p>
                      <p className="text-xs text-gray-500">{getContactTypeLabel(type)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                <select
                  value={filters.contactType}
                  onChange={(e) => setFilters({...filters, contactType: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Contact Types</option>
                  {contactTypes.map(type => (
                    <option key={type} value={type}>
                      {getContactTypeLabel(type)}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Start Date"
                />

                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="End Date"
                />

                <div></div>

                <button
                  onClick={() => setFilters({ memberId: '', contactType: '', contactedById: '', startDate: '', endDate: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact History List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading contact history...</p>
            </div>
          ) : contactHistory.length === 0 ? (
            <div className="p-8 text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No contact history found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by logging your first contact.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {contactHistory.map((contact) => {
                const Icon = contactTypeIcons[contact.contactType]
                return (
                  <li key={contact.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-gray-400" />
                          <h3 className="text-sm font-medium text-gray-900">
                            {contact.member.firstName} {contact.member.lastName}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contactTypeColors[contact.contactType]}`}>
                            {getContactTypeLabel(contact.contactType)}
                          </span>
                          {contact.followUpDate && new Date(contact.followUpDate) <= new Date() && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Follow-up Due
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>By: {contact.contactedBy.email}</span>
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDateTime(contact.contactDate)}
                          </span>
                          {contact.followUpDate && (
                            <span>Follow-up: {formatDate(contact.followUpDate)}</span>
                          )}
                        </div>
                        
                        {contact.subject && (
                          <div className="mt-1 text-sm text-gray-600">
                            <strong>Subject:</strong> {contact.subject}
                          </div>
                        )}

                        <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                          <strong>Notes:</strong> {contact.notes}
                        </div>

                        {contact.outcome && (
                          <div className="mt-1 text-sm text-gray-600">
                            <strong>Outcome:</strong> {contact.outcome}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedContact(contact)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {selectedContact.member.firstName} {selectedContact.member.lastName}
                  </h4>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contactTypeColors[selectedContact.contactType]}`}>
                      {getContactTypeLabel(selectedContact.contactType)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedContact.contactDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contacted By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.contactedBy.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Contact</label>
                  <div className="mt-1 text-sm text-gray-900">
                    <p>{selectedContact.member.email}</p>
                    {selectedContact.member.phone && <p>{selectedContact.member.phone}</p>}
                  </div>
                </div>

                {selectedContact.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.subject}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedContact.notes}</p>
                </div>

                {selectedContact.outcome && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Outcome</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedContact.outcome}</p>
                  </div>
                )}

                {selectedContact.followUpDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedContact.followUpDate)}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Logged</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedContact.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedContact(null)}
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
