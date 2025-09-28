'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import EventForm from '@/components/forms/EventForm'
import { formatDate } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

interface Event {
  id: string
  title: string
  description: string
  startDateTime: string
  endDateTime: string
  location: string
  eventType: string
  maxAttendees?: number
  registrationCount: number
  attendanceCount: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [typeFilter])

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (eventData: any) => {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create event')
    }

    await fetchEvents()
  }

  const handleEditEvent = async (eventData: any) => {
    if (!editingEvent) return

    const response = await fetch(`/api/events/${editingEvent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update event')
    }

    await fetchEvents()
    setEditingEvent(null)
  }

  const openEditForm = (event: Event) => {
    setEditingEvent(event)
    setShowEventForm(true)
  }

  const closeForm = () => {
    setShowEventForm(false)
    setEditingEvent(null)
  }

  const getEventTypeColor = (type: string) => {
    const colors = {
      SERVICE: 'bg-blue-100 text-blue-800',
      MEETING: 'bg-green-100 text-green-800',
      SOCIAL: 'bg-purple-100 text-purple-800',
      OUTREACH: 'bg-orange-100 text-orange-800',
      EDUCATION: 'bg-indigo-100 text-indigo-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const isUpcoming = (dateTime: string) => {
    return new Date(dateTime) > new Date()
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Events</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your church events, services, and activities.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowEventForm(true)}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Create Event
            </button>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-4">
            <select
              className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="SERVICE">Services</option>
              <option value="MEETING">Meetings</option>
              <option value="SOCIAL">Social</option>
              <option value="OUTREACH">Outreach</option>
              <option value="EDUCATION">Education</option>
            </select>
          </div>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Events List */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {events.map((event) => {
              const startTime = formatDateTime(event.startDateTime)
              const endTime = formatDateTime(event.endDateTime)
              const upcoming = isUpcoming(event.startDateTime)
              
              return (
                <div key={event.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                          {event.eventType}
                        </span>
                        {upcoming && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            Upcoming
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4">{event.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          <span>{startTime.date}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          <span>{startTime.time} - {endTime.time}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4 text-sm">
                        <div className="flex items-center text-blue-600">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          <span>{event.registrationCount} registered</span>
                        </div>
                        <div className="flex items-center text-green-600">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span>{event.attendanceCount} attended</span>
                        </div>
                        {event.maxAttendees && (
                          <div className="text-gray-500">
                            <span>Capacity: {event.maxAttendees}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {upcoming && (
                        <button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                          Check-in
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-gray-600">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {events.length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No events</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first event.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    New Event
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View Placeholder */}
        {viewMode === 'calendar' && (
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-8">
            <div className="text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-semibold text-gray-900">Calendar View</h3>
              <p className="mt-1 text-sm text-gray-500">
                Full calendar integration coming soon. For now, use the list view to manage your events.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setViewMode('list')}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  View List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      <EventForm
        isOpen={showEventForm}
        onClose={closeForm}
        onSubmit={editingEvent ? handleEditEvent : handleCreateEvent}
        event={editingEvent || undefined}
        isEditing={!!editingEvent}
      />
    </Layout>
  )
}
