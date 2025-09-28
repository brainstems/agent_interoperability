'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import GroupForm from '@/components/forms/GroupForm'
import { formatDate, getInitials } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  UserGroupIcon,
  MapPinIcon,
  CalendarIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

interface Group {
  id: string
  name: string
  description: string
  groupType: string
  meetingSchedule: string
  maxCapacity?: number
  memberCount: number
  leader: {
    firstName: string
    lastName: string
  }
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [typeFilter])

  const fetchGroups = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`/api/groups?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGroups(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (groupData: any) => {
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(groupData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create group')
    }

    await fetchGroups()
  }

  const handleEditGroup = async (groupData: any) => {
    if (!editingGroup) return

    const response = await fetch(`/api/groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(groupData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update group')
    }

    await fetchGroups()
    setEditingGroup(null)
  }

  const openEditForm = (group: Group) => {
    setEditingGroup(group)
    setShowGroupForm(true)
  }

  const closeForm = () => {
    setShowGroupForm(false)
    setEditingGroup(null)
  }

  const getGroupTypeColor = (type: string) => {
    const colors = {
      SMALL_GROUP: 'bg-blue-100 text-blue-800',
      MINISTRY: 'bg-green-100 text-green-800',
      COMMITTEE: 'bg-purple-100 text-purple-800',
      YOUTH: 'bg-orange-100 text-orange-800',
      ADULT: 'bg-indigo-100 text-indigo-800',
      CHILDREN: 'bg-pink-100 text-pink-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
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
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Groups</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage small groups, ministries, and committees in your church.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowGroupForm(true)}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Create Group
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select
              className="block rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Groups</option>
              <option value="SMALL_GROUP">Small Groups</option>
              <option value="MINISTRY">Ministries</option>
              <option value="COMMITTEE">Committees</option>
              <option value="YOUTH">Youth</option>
              <option value="ADULT">Adult</option>
              <option value="CHILDREN">Children</option>
            </select>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getGroupTypeColor(group.groupType)}`}>
                      {group.groupType.replace('_', ' ')}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{group.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-500">
                    <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                      {group.maxCapacity && ` / ${group.maxCapacity} max`}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Led by {group.leader.firstName} {group.leader.lastName}</span>
                  </div>
                  
                  {group.meetingSchedule && (
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{group.meetingSchedule}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex gap-2">
                  <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Manage
                  </button>
                </div>
              </div>
              
              {/* Progress bar for capacity */}
              {group.maxCapacity && (
                <div className="px-6 pb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((group.memberCount / group.maxCapacity) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{group.memberCount} members</span>
                    <span>{group.maxCapacity} capacity</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && !loading && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {searchTerm ? 'No groups found' : 'No groups'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms or filters.'
                : 'Get started by creating your first group.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  New Group
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{groups.length}</div>
              <div className="text-sm text-gray-500">Total Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {groups.reduce((sum, group) => sum + group.memberCount, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {groups.filter(g => g.groupType === 'SMALL_GROUP').length}
              </div>
              <div className="text-sm text-gray-500">Small Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {groups.filter(g => g.groupType === 'MINISTRY').length}
              </div>
              <div className="text-sm text-gray-500">Ministries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Form Modal */}
      <GroupForm
        isOpen={showGroupForm}
        onClose={closeForm}
        onSubmit={editingGroup ? handleEditGroup : handleCreateGroup}
        group={editingGroup || undefined}
        isEditing={!!editingGroup}
      />
    </Layout>
  )
}
