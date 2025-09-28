'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import TagForm from '@/components/forms/TagForm'
import TagRuleForm from '@/components/forms/TagRuleForm'
import { useNotification } from '@/contexts/NotificationContext'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  UserGroupIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface Tag {
  id: string
  name: string
  displayName: string
  description?: string
  tagType: string
  color: string
  icon?: string
  isActive: boolean
  isPublic: boolean
  autoAssign: boolean
  autoRemove: boolean
  memberCount: number
  usageCount: number
  category?: string
  createdAt: string
}

interface TagRule {
  id: string
  tagId: string
  name: string
  description?: string
  isActive: boolean
  ruleOperator: string
  conditions: any[]
  runFrequency: string
  lastRunAt?: string
  executionCount: number
  affectedMembersCount: number
}

export default function TagsPage() {
  const { showSuccess, showError } = useNotification()
  const [tags, setTags] = useState<Tag[]>([])
  const [tagRules, setTagRules] = useState<TagRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('tags')
  const [showTagForm, setShowTagForm] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editingRule, setEditingRule] = useState<TagRule | null>(null)

  useEffect(() => {
    fetchTags()
    fetchTagRules()
  }, [categoryFilter, typeFilter])

  const fetchTags = async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (typeFilter !== 'all') params.append('tagType', typeFilter)

      const response = await fetch(`/api/tags?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTags(data.data || [])
      } else {
        showError('Error', 'Failed to load tags')
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      showError('Error', 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const fetchTagRules = async () => {
    try {
      const response = await fetch('/api/tags/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTagRules(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch tag rules:', error)
    }
  }

  const handleCreateTag = async (tagData: any) => {
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(tagData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create tag')
    }

    await fetchTags()
    showSuccess('Success', 'Tag created successfully')
  }

  const handleEditTag = async (tagData: any) => {
    if (!editingTag) return

    const response = await fetch('/api/tags', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: editingTag.id, ...tagData })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update tag')
    }

    await fetchTags()
    setEditingTag(null)
    showSuccess('Success', 'Tag updated successfully')
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all members.')) {
      return
    }

    try {
      const response = await fetch(`/api/tags?id=${tagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete tag')
      }

      await fetchTags()
      showSuccess('Success', 'Tag deleted successfully')
    } catch (error) {
      console.error('Failed to delete tag:', error)
      showError('Error', 'Failed to delete tag')
    }
  }

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/tags/rules/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ruleId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to execute rule')
      }

      const data = await response.json()
      await fetchTagRules()
      showSuccess('Success', `Rule executed successfully. ${data.affectedCount} members affected.`)
    } catch (error) {
      console.error('Failed to execute rule:', error)
      showError('Error', 'Failed to execute rule')
    }
  }

  const openEditTagForm = (tag: Tag) => {
    setEditingTag(tag)
    setShowTagForm(true)
  }

  const openEditRuleForm = (rule: TagRule) => {
    setEditingRule(rule)
    setShowRuleForm(true)
  }

  const closeTagForm = () => {
    setShowTagForm(false)
    setEditingTag(null)
  }

  const closeRuleForm = () => {
    setShowRuleForm(false)
    setEditingRule(null)
  }

  const getTagTypeBadge = (tagType: string) => {
    const colors: Record<string, string> = {
      'MANUAL': 'bg-blue-100 text-blue-800',
      'AUTOMATIC': 'bg-green-100 text-green-800',
      'COMPUTED': 'bg-purple-100 text-purple-800',
      'SYSTEM': 'bg-gray-100 text-gray-800'
    }
    return colors[tagType] || 'bg-gray-100 text-gray-800'
  }

  const getColorBadge = (color: string) => {
    const colorClasses: Record<string, string> = {
      'RED': 'bg-red-100 text-red-800',
      'BLUE': 'bg-blue-100 text-blue-800',
      'GREEN': 'bg-green-100 text-green-800',
      'YELLOW': 'bg-yellow-100 text-yellow-800',
      'PURPLE': 'bg-purple-100 text-purple-800',
      'ORANGE': 'bg-orange-100 text-orange-800',
      'PINK': 'bg-pink-100 text-pink-800',
      'GRAY': 'bg-gray-100 text-gray-800'
    }
    return colorClasses[color] || 'bg-gray-100 text-gray-800'
  }

  const filteredTags = tags.filter(tag =>
    tag.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRules = tagRules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          title="Tags & Automation"
          subtitle="Manage tags and automated tagging rules for organizing and categorizing members."
        >
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowRuleForm(true)}
              variant="outline"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
            <Button
              onClick={() => setShowTagForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </div>
        </PageHeader>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('tags')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tags'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TagIcon className="h-4 w-4 inline mr-2" />
              Tags ({tags.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
              Automation Rules ({tagRules.length})
            </button>
          </nav>
        </div>

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
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {activeTab === 'tags' && (
                <>
                  <div className="sm:w-48">
                    <select
                      className="form-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="Ministry">Ministry</option>
                      <option value="Demographics">Demographics</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
                  <div className="sm:w-48">
                    <select
                      className="form-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="MANUAL">Manual</option>
                      <option value="AUTOMATIC">Automatic</option>
                      <option value="COMPUTED">Computed</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${getColorBadge(tag.color).replace('text-', 'bg-').replace('-800', '-400')}`}></div>
                        <div>
                          <div className="font-medium text-secondary-900 flex items-center">
                            {tag.icon && <span className="mr-2">{tag.icon}</span>}
                            {tag.displayName}
                          </div>
                          <div className="text-secondary-500 text-sm">
                            {tag.name}
                          </div>
                          {tag.description && (
                            <div className="text-secondary-400 text-xs mt-1">
                              {tag.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTagTypeBadge(tag.tagType)}>
                        {tag.tagType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {tag.category || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1 text-secondary-400" />
                        {tag.memberCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {tag.usageCount} times
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={tag.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {tag.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {tag.autoAssign && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTagForm(tag)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
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

            {filteredTags.length === 0 && (
              <div className="text-center py-12">
                <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tags found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first tag.
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setShowTagForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => {
                  const associatedTag = tags.find(tag => tag.id === rule.tagId)
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-secondary-900">
                            {rule.name}
                          </div>
                          {rule.description && (
                            <div className="text-secondary-500 text-sm">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {associatedTag && (
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getColorBadge(associatedTag.color).replace('text-', 'bg-').replace('-800', '-400')}`}></div>
                            {associatedTag.displayName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-secondary-500">
                        {rule.runFrequency}
                      </TableCell>
                      <TableCell className="text-secondary-500">
                        {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1 text-secondary-400" />
                          {rule.affectedMembersCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecuteRule(rule.id)}
                            disabled={!rule.isActive}
                          >
                            <PlayIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRuleForm(rule)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* handleDeleteRule(rule.id) */}}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredRules.length === 0 && (
              <div className="text-center py-12">
                <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No automation rules</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create rules to automatically assign tags based on member criteria.
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setShowRuleForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Tag Form Modal */}
      <TagForm
        isOpen={showTagForm}
        onClose={closeTagForm}
        onSubmit={editingTag ? handleEditTag : handleCreateTag}
        tag={editingTag || undefined}
        isEditing={!!editingTag}
      />

      {/* Tag Rule Form Modal */}
      <TagRuleForm
        isOpen={showRuleForm}
        onClose={closeRuleForm}
        onSubmit={async () => {/* handleCreateRule */}}
        rule={editingRule || undefined}
        isEditing={!!editingRule}
        availableTags={tags}
      />
    </Layout>
  )
}
