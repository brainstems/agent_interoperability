'use client'

import React, { useState } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { useNotification } from '@/contexts/NotificationContext'

interface SmartListFormData {
  name: string
  description: string
  isActive: boolean
  isPublic: boolean
  refreshFrequency: string
  maxMembers: number | null
  tagRules: any
  fieldRules: any
  customSql: string
}

interface SmartListFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SmartListFormData) => Promise<void>
  smartList?: Partial<SmartListFormData>
  isEditing?: boolean
}

const initialFormData: SmartListFormData = {
  name: '',
  description: '',
  isActive: true,
  isPublic: true,
  refreshFrequency: 'daily',
  maxMembers: null,
  tagRules: null,
  fieldRules: null,
  customSql: ''
}

const refreshFrequencies = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual Only' }
]

export default function SmartListForm({ isOpen, onClose, onSubmit, smartList, isEditing = false }: SmartListFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<SmartListFormData>({
    ...initialFormData,
    ...smartList
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  const handleInputChange = (field: keyof SmartListFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'List name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
      // Reset form
      setFormData(initialFormData)
      setErrors({})
      setActiveTab('basic')
    } catch (error) {
      console.error('Form submission error:', error)
      showError(
        isEditing ? 'Update Failed' : 'Creation Failed',
        error instanceof Error ? error.message : 'Failed to save smart list. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    setActiveTab('basic')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Smart List' : 'Create Smart List'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('criteria')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'criteria'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Criteria
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'advanced'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Advanced
            </button>
          </nav>
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-300' : ''}
                placeholder="e.g., New Members Last 30 Days"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Describe what this smart list contains"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refresh Frequency
                </label>
                <select
                  value={formData.refreshFrequency}
                  onChange={(e) => handleInputChange('refreshFrequency', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {refreshFrequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Members (Optional)
                </label>
                <Input
                  type="number"
                  value={formData.maxMembers || ''}
                  onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value) || null)}
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Active list (automatically refreshes)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Visible to all users
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Criteria Tab */}
        {activeTab === 'criteria' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Selection Criteria</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Visual Query Builder Coming Soon
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      The drag-and-drop criteria builder is under development. For now, you can use the Advanced tab to write custom SQL queries.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Available Criteria Types:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium text-gray-900">Member Properties</h5>
                    <ul className="mt-1 text-sm text-gray-600 space-y-1">
                      <li>• Join date ranges</li>
                      <li>• Age groups</li>
                      <li>• Member status</li>
                      <li>• Gender</li>
                      <li>• Marital status</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium text-gray-900">Custom Fields</h5>
                    <ul className="mt-1 text-sm text-gray-600 space-y-1">
                      <li>• Text field contains</li>
                      <li>• Number comparisons</li>
                      <li>• Date ranges</li>
                      <li>• Boolean values</li>
                      <li>• Select options</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium text-gray-900">Activity</h5>
                    <ul className="mt-1 text-sm text-gray-600 space-y-1">
                      <li>• Attendance patterns</li>
                      <li>• Giving history</li>
                      <li>• Event participation</li>
                      <li>• Communication engagement</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h5 className="font-medium text-gray-900">Groups & Tags</h5>
                    <ul className="mt-1 text-sm text-gray-600 space-y-1">
                      <li>• Has specific tags</li>
                      <li>• Group membership</li>
                      <li>• Ministry involvement</li>
                      <li>• Leadership roles</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom SQL Query
              </label>
              <div className="mb-2">
                <p className="text-sm text-gray-500">
                  Write a custom SQL query to select member IDs. The query should return a column named 'id'.
                </p>
              </div>
              <textarea
                value={formData.customSql}
                onChange={(e) => handleInputChange('customSql', e.target.value)}
                rows={8}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-sm"
                placeholder={`-- Example: Members who joined in the last 30 days
SELECT id FROM profiles 
WHERE church_id = $1 
  AND join_date >= CURRENT_DATE - INTERVAL '30 days'
  AND member_status = 'MEMBER'
ORDER BY join_date DESC;`}
              />
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  <strong>Security Note:</strong> Custom SQL queries are executed with limited permissions and are sanitized for security.
                  Use $1 as a placeholder for the church_id parameter.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    SQL Query Tips
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Always include <code>church_id = $1</code> in your WHERE clause</li>
                      <li>Query must return an 'id' column containing member profile IDs</li>
                      <li>Use table names: profiles, donations, event_attendance, group_members, etc.</li>
                      <li>Test your queries carefully before saving</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update List' : 'Create List'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
