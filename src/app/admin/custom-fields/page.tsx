'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import CustomFieldForm from '@/components/forms/CustomFieldForm'
import { useNotification } from '@/contexts/NotificationContext'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface CustomFieldDefinition {
  id: string
  name: string
  displayName: string
  description?: string
  fieldType: string
  recordType: string
  isRequired: boolean
  isVisible: boolean
  isSearchable: boolean
  options?: string[]
  defaultValue?: any
  validationRules?: any
  category?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function CustomFieldsPage() {
  const { showSuccess, showError } = useNotification()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [recordTypeFilter, setRecordTypeFilter] = useState('all')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('all')
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)

  useEffect(() => {
    fetchFields()
  }, [recordTypeFilter, fieldTypeFilter])

  const fetchFields = async () => {
    try {
      const params = new URLSearchParams()
      if (recordTypeFilter !== 'all') params.append('recordType', recordTypeFilter)
      if (fieldTypeFilter !== 'all') params.append('fieldType', fieldTypeFilter)

      const response = await fetch(`/api/custom-fields/definitions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFields(data.data || [])
      } else {
        showError('Error', 'Failed to load custom fields')
      }
    } catch (error) {
      console.error('Failed to fetch custom fields:', error)
      showError('Error', 'Failed to load custom fields')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateField = async (fieldData: any) => {
    const response = await fetch('/api/custom-fields/definitions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(fieldData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create custom field')
    }

    await fetchFields()
    showSuccess('Success', 'Custom field created successfully')
  }

  const handleEditField = async (fieldData: any) => {
    if (!editingField) return

    const response = await fetch('/api/custom-fields/definitions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: editingField.id, ...fieldData })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update custom field')
    }

    await fetchFields()
    setEditingField(null)
    showSuccess('Success', 'Custom field updated successfully')
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/custom-fields/definitions?id=${fieldId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete custom field')
      }

      await fetchFields()
      showSuccess('Success', 'Custom field deleted successfully')
    } catch (error) {
      console.error('Failed to delete custom field:', error)
      showError('Error', 'Failed to delete custom field')
    }
  }

  const toggleFieldVisibility = async (fieldId: string, isVisible: boolean) => {
    try {
      const response = await fetch('/api/custom-fields/definitions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id: fieldId, isVisible: !isVisible })
      })

      if (!response.ok) {
        throw new Error('Failed to update field visibility')
      }

      await fetchFields()
      showSuccess('Success', `Field ${!isVisible ? 'shown' : 'hidden'} successfully`)
    } catch (error) {
      console.error('Failed to toggle field visibility:', error)
      showError('Error', 'Failed to update field visibility')
    }
  }

  const openEditForm = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setShowFieldForm(true)
  }

  const closeForm = () => {
    setShowFieldForm(false)
    setEditingField(null)
  }

  const getFieldTypeBadge = (fieldType: string) => {
    const colors: Record<string, string> = {
      'TEXT': 'bg-blue-100 text-blue-800',
      'NUMBER': 'bg-green-100 text-green-800',
      'DATE': 'bg-purple-100 text-purple-800',
      'BOOLEAN': 'bg-yellow-100 text-yellow-800',
      'SELECT': 'bg-indigo-100 text-indigo-800',
      'TEXTAREA': 'bg-gray-100 text-gray-800',
      'EMAIL': 'bg-red-100 text-red-800',
      'PHONE': 'bg-orange-100 text-orange-800'
    }
    return colors[fieldType] || 'bg-gray-100 text-gray-800'
  }

  const getRecordTypeBadge = (recordType: string) => {
    const colors: Record<string, string> = {
      'MEMBER': 'bg-blue-100 text-blue-800',
      'EVENT': 'bg-green-100 text-green-800',
      'DONATION': 'bg-purple-100 text-purple-800',
      'GROUP': 'bg-yellow-100 text-yellow-800'
    }
    return colors[recordType] || 'bg-gray-100 text-gray-800'
  }

  const filteredFields = fields.filter(field =>
    field.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          title="Custom Fields"
          subtitle="Manage custom fields for different record types in your church management system."
        >
          <Button
            onClick={() => setShowFieldForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Custom Field
          </Button>
        </PageHeader>

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
                    placeholder="Search custom fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={recordTypeFilter}
                  onChange={(e) => setRecordTypeFilter(e.target.value)}
                >
                  <option value="all">All Record Types</option>
                  <option value="MEMBER">Member</option>
                  <option value="EVENT">Event</option>
                  <option value="DONATION">Donation</option>
                  <option value="GROUP">Group</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={fieldTypeFilter}
                  onChange={(e) => setFieldTypeFilter(e.target.value)}
                >
                  <option value="all">All Field Types</option>
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="BOOLEAN">Boolean</option>
                  <option value="SELECT">Select</option>
                  <option value="TEXTAREA">Textarea</option>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Custom Fields Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Record Type</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="relative">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-secondary-900">
                        {field.displayName}
                      </div>
                      <div className="text-secondary-500 text-sm">
                        {field.name}
                      </div>
                      {field.description && (
                        <div className="text-secondary-400 text-xs mt-1">
                          {field.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getFieldTypeBadge(field.fieldType)}>
                      {field.fieldType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRecordTypeBadge(field.recordType)}>
                      {field.recordType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {field.isRequired && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          Required
                        </Badge>
                      )}
                      {field.isSearchable && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Searchable
                        </Badge>
                      )}
                      {field.options && field.options.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {field.options.length} options
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-secondary-500">
                    {field.category || '-'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleFieldVisibility(field.id, field.isVisible)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        field.isVisible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {field.isVisible ? (
                        <>
                          <EyeIcon className="h-3 w-3 mr-1" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeSlashIcon className="h-3 w-3 mr-1" />
                          Hidden
                        </>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(field)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(field.id)}
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

          {filteredFields.length === 0 && (
            <div className="text-center py-12">
              <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No custom fields</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first custom field.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setShowFieldForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Custom Field
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Custom Field Form Modal */}
      <CustomFieldForm
        isOpen={showFieldForm}
        onClose={closeForm}
        onSubmit={editingField ? handleEditField : handleCreateField}
        field={editingField || undefined}
        isEditing={!!editingField}
      />
    </Layout>
  )
}
