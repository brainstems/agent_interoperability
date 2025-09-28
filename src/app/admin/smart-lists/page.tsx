'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import SmartListForm from '@/components/forms/SmartListForm'
import { useNotification } from '@/contexts/NotificationContext'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  UserGroupIcon,
  ClockIcon,
  Cog6ToothIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'

interface SmartList {
  id: string
  name: string
  description?: string
  isActive: boolean
  isPublic: boolean
  refreshFrequency: string
  maxMembers?: number
  memberCount: number
  lastCalculatedAt?: string
  calculationTimeMs?: number
  tagRules?: any
  fieldRules?: any
  customSql?: string
  createdAt: string
  updatedAt: string
}

interface QueryCondition {
  field: string
  operator: string
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export default function SmartListsPage() {
  const { showSuccess, showError } = useNotification()
  const [smartLists, setSmartLists] = useState<SmartList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showListForm, setShowListForm] = useState(false)
  const [editingList, setEditingList] = useState<SmartList | null>(null)
  const [activeTab, setActiveTab] = useState('lists')

  useEffect(() => {
    fetchSmartLists()
  }, [statusFilter])

  const fetchSmartLists = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('isActive', statusFilter)

      const response = await fetch(`/api/smart-lists?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSmartLists(data.data || [])
      } else {
        showError('Error', 'Failed to load smart lists')
      }
    } catch (error) {
      console.error('Failed to fetch smart lists:', error)
      showError('Error', 'Failed to load smart lists')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async (listData: any) => {
    const response = await fetch('/api/smart-lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(listData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create smart list')
    }

    await fetchSmartLists()
    showSuccess('Success', 'Smart list created successfully')
  }

  const handleEditList = async (listData: any) => {
    if (!editingList) return

    const response = await fetch('/api/smart-lists', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: editingList.id, ...listData })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update smart list')
    }

    await fetchSmartLists()
    setEditingList(null)
    showSuccess('Success', 'Smart list updated successfully')
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this smart list?')) {
      return
    }

    try {
      const response = await fetch(`/api/smart-lists?id=${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete smart list')
      }

      await fetchSmartLists()
      showSuccess('Success', 'Smart list deleted successfully')
    } catch (error) {
      console.error('Failed to delete smart list:', error)
      showError('Error', 'Failed to delete smart list')
    }
  }

  const handleCalculateList = async (listId: string) => {
    try {
      const response = await fetch(`/api/smart-lists/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ listId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to calculate smart list')
      }

      const data = await response.json()
      await fetchSmartLists()
      showSuccess('Success', `Smart list calculated successfully. ${data.memberCount} members found.`)
    } catch (error) {
      console.error('Failed to calculate smart list:', error)
      showError('Error', 'Failed to calculate smart list')
    }
  }

  const openEditForm = (list: SmartList) => {
    setEditingList(list)
    setShowListForm(true)
  }

  const closeForm = () => {
    setShowListForm(false)
    setEditingList(null)
  }

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      'hourly': 'bg-red-100 text-red-800',
      'daily': 'bg-blue-100 text-blue-800',
      'weekly': 'bg-green-100 text-green-800',
      'monthly': 'bg-purple-100 text-purple-800',
      'manual': 'bg-gray-100 text-gray-800'
    }
    return colors[frequency] || 'bg-gray-100 text-gray-800'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const filteredLists = smartLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 loading-skeleton w-1/4"></div>
          <div className="h-10 loading-skeleton"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 loading-skeleton"></div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Smart Lists & Query Builder"
          subtitle="Create dynamic member lists based on custom criteria and automated rules."
        >
          <Button
            onClick={() => setShowListForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Smart List
          </Button>
        </PageHeader>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('lists')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lists'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ListBulletIcon className="h-4 w-4 inline mr-2" />
              Smart Lists ({smartLists.length})
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'builder'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
              Query Builder
            </button>
          </nav>
        </div>

        {/* Smart Lists Tab */}
        {activeTab === 'lists' && (
          <>
            {/* Filters */}
            <Card>
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
                      </div>
                      <Input
                        type="text"
                        className="pl-10"
                        placeholder="Search smart lists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Lists</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Smart Lists Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Refresh Frequency</TableHead>
                    <TableHead>Last Calculated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="relative">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-secondary-900">
                            {list.name}
                          </div>
                          {list.description && (
                            <div className="text-secondary-500 text-sm">
                              {list.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1 text-secondary-400" />
                          {list.memberCount}
                          {list.maxMembers && (
                            <span className="text-secondary-500 ml-1">
                              / {list.maxMembers}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFrequencyBadge(list.refreshFrequency)}>
                          {list.refreshFrequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-secondary-500">
                        {list.lastCalculatedAt ? (
                          <div>
                            <div>{formatTimestamp(list.lastCalculatedAt)}</div>
                            {list.calculationTimeMs && (
                              <div className="text-xs text-secondary-400">
                                {list.calculationTimeMs}ms
                              </div>
                            )}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={list.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {list.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {list.isPublic && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCalculateList(list.id)}
                            disabled={!list.isActive}
                          >
                            <PlayIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(list)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteList(list.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLists.length === 0 && (
                <div className="text-center py-12">
                  <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No smart lists found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first smart list.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setShowListForm(true)}
                      className="bg-indigo-600 hover:bg-indigo-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Smart List
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Query Builder Tab */}
        {activeTab === 'builder' && (
          <Card>
            <div className="p-6 text-center">
              <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Advanced Query Builder
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-2xl mx-auto">
                The visual query builder is coming soon! This will allow you to create complex 
                member queries using a drag-and-drop interface with conditions like:
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto text-left">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Member Criteria</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Join date ranges</li>
                    <li>• Age groups</li>
                    <li>• Member status</li>
                    <li>• Custom field values</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Activity Criteria</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Attendance patterns</li>
                    <li>• Giving history</li>
                    <li>• Event participation</li>
                    <li>• Communication engagement</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Group Criteria</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Group membership</li>
                    <li>• Ministry involvement</li>
                    <li>• Leadership roles</li>
                    <li>• Volunteer status</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Advanced Logic</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• AND/OR conditions</li>
                    <li>• Nested groups</li>
                    <li>• Date calculations</li>
                    <li>• Custom SQL queries</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Smart List Form Modal */}
      <SmartListForm
        isOpen={showListForm}
        onClose={closeForm}
        onSubmit={editingList ? handleEditList : handleCreateList}
        smartList={editingList || undefined}
        isEditing={!!editingList}
      />
    </Layout>
  )
}
