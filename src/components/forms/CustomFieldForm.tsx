'use client'

import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { useNotification } from '@/contexts/NotificationContext'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface CustomFieldFormData {
  name: string
  displayName: string
  description: string
  fieldType: string
  recordType: string
  isRequired: boolean
  isVisible: boolean
  isSearchable: boolean
  options: string[]
  defaultValue: any
  category: string
  sortOrder: number
  validationRules: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

interface CustomFieldFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CustomFieldFormData) => Promise<void>
  field?: Partial<CustomFieldFormData>
  isEditing?: boolean
}

const initialFormData: CustomFieldFormData = {
  name: '',
  displayName: '',
  description: '',
  fieldType: 'TEXT',
  recordType: 'MEMBER',
  isRequired: false,
  isVisible: true,
  isSearchable: false,
  options: [],
  defaultValue: null,
  category: '',
  sortOrder: 0,
  validationRules: {}
}

const fieldTypes = [
  { value: 'TEXT', label: 'Text', description: 'Single line text input' },
  { value: 'TEXTAREA', label: 'Textarea', description: 'Multi-line text input' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric input' },
  { value: 'DATE', label: 'Date', description: 'Date picker' },
  { value: 'BOOLEAN', label: 'Boolean', description: 'Yes/No checkbox' },
  { value: 'SELECT', label: 'Select', description: 'Dropdown with predefined options' },
  { value: 'EMAIL', label: 'Email', description: 'Email address input' },
  { value: 'PHONE', label: 'Phone', description: 'Phone number input' },
  { value: 'URL', label: 'URL', description: 'Website URL input' }
]

const recordTypes = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'EVENT', label: 'Event' },
  { value: 'DONATION', label: 'Donation' },
  { value: 'GROUP', label: 'Group' }
]

export default function CustomFieldForm({ isOpen, onClose, onSubmit, field, isEditing = false }: CustomFieldFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<CustomFieldFormData>({
    ...initialFormData,
    ...field
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    if (field) {
      setFormData({
        ...initialFormData,
        ...field,
        options: field.options || [],
        validationRules: field.validationRules || {}
      })
    }
  }, [field])

  const handleInputChange = (field: keyof CustomFieldFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleValidationRuleChange = (rule: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      validationRules: {
        ...prev.validationRules,
        [rule]: value
      }
    }))
  }

  const addOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }))
      setNewOption('')
    }
  }

  const removeOption = (optionToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(option => option !== optionToRemove)
    }))
  }

  const generateFieldName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required'
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Field name must start with a letter and contain only lowercase letters, numbers, and underscores'
    }

    if (formData.fieldType === 'SELECT' && formData.options.length === 0) {
      newErrors.options = 'At least one option is required for select fields'
    }

    if (formData.validationRules.minLength && formData.validationRules.maxLength) {
      if (formData.validationRules.minLength > formData.validationRules.maxLength) {
        newErrors.validationRules = 'Minimum length cannot be greater than maximum length'
      }
    }

    if (formData.validationRules.min !== undefined && formData.validationRules.max !== undefined) {
      if (formData.validationRules.min > formData.validationRules.max) {
        newErrors.validationRules = 'Minimum value cannot be greater than maximum value'
      }
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
      setNewOption('')
    } catch (error) {
      console.error('Form submission error:', error)
      showError(
        isEditing ? 'Update Failed' : 'Creation Failed',
        error instanceof Error ? error.message : 'Failed to save custom field. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    setNewOption('')
    onClose()
  }

  const selectedFieldType = fieldTypes.find(type => type.value === formData.fieldType)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Custom Field' : 'Create Custom Field'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <Input
                type="text"
                value={formData.displayName}
                onChange={(e) => {
                  handleInputChange('displayName', e.target.value)
                  // Auto-generate field name if not editing
                  if (!isEditing) {
                    handleInputChange('name', generateFieldName(e.target.value))
                  }
                }}
                className={errors.displayName ? 'border-red-300' : ''}
                placeholder="e.g., Emergency Contact"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-300' : ''}
                placeholder="e.g., emergency_contact"
                disabled={isEditing} // Don't allow changing field name when editing
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Used internally. Must be lowercase with underscores.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Optional description for this field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type *
              </label>
              <select
                value={formData.fieldType}
                onChange={(e) => handleInputChange('fieldType', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedFieldType && (
                <p className="mt-1 text-xs text-gray-500">
                  {selectedFieldType.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Record Type *
              </label>
              <select
                value={formData.recordType}
                onChange={(e) => handleInputChange('recordType', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {recordTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g., Contact Info, Personal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Field Properties */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Field Properties</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => handleInputChange('isRequired', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Required field
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isVisible}
                onChange={(e) => handleInputChange('isVisible', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Visible in forms
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isSearchable}
                onChange={(e) => handleInputChange('isSearchable', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Searchable field
              </label>
            </div>
          </div>
        </div>

        {/* Options for Select Fields */}
        {formData.fieldType === 'SELECT' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Select Options</h3>
            
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options]
                      newOptions[index] = e.target.value
                      handleInputChange('options', newOptions)
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(option)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add new option"
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOption()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                disabled={!newOption.trim()}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>

            {errors.options && (
              <p className="text-sm text-red-600">{errors.options}</p>
            )}
          </div>
        )}

        {/* Validation Rules */}
        {['TEXT', 'TEXTAREA', 'NUMBER'].includes(formData.fieldType) && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Validation Rules</h3>
            
            {['TEXT', 'TEXTAREA'].includes(formData.fieldType) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Length
                  </label>
                  <Input
                    type="number"
                    value={formData.validationRules.minLength || ''}
                    onChange={(e) => handleValidationRuleChange('minLength', parseInt(e.target.value) || undefined)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Length
                  </label>
                  <Input
                    type="number"
                    value={formData.validationRules.maxLength || ''}
                    onChange={(e) => handleValidationRuleChange('maxLength', parseInt(e.target.value) || undefined)}
                    placeholder="255"
                  />
                </div>
              </div>
            )}

            {formData.fieldType === 'NUMBER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Value
                  </label>
                  <Input
                    type="number"
                    value={formData.validationRules.min || ''}
                    onChange={(e) => handleValidationRuleChange('min', parseFloat(e.target.value) || undefined)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Value
                  </label>
                  <Input
                    type="number"
                    value={formData.validationRules.max || ''}
                    onChange={(e) => handleValidationRuleChange('max', parseFloat(e.target.value) || undefined)}
                    placeholder="100"
                  />
                </div>
              </div>
            )}

            {errors.validationRules && (
              <p className="text-sm text-red-600">{errors.validationRules}</p>
            )}
          </div>
        )}

        {/* Default Value */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Default Value</h3>
          
          {formData.fieldType === 'TEXT' && (
            <Input
              type="text"
              value={formData.defaultValue || ''}
              onChange={(e) => handleInputChange('defaultValue', e.target.value)}
              placeholder="Default text value"
            />
          )}

          {formData.fieldType === 'NUMBER' && (
            <Input
              type="number"
              value={formData.defaultValue || ''}
              onChange={(e) => handleInputChange('defaultValue', parseFloat(e.target.value) || null)}
              placeholder="Default number value"
            />
          )}

          {formData.fieldType === 'DATE' && (
            <Input
              type="date"
              value={formData.defaultValue || ''}
              onChange={(e) => handleInputChange('defaultValue', e.target.value)}
            />
          )}

          {formData.fieldType === 'BOOLEAN' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.defaultValue || false}
                onChange={(e) => handleInputChange('defaultValue', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Default to checked
              </label>
            </div>
          )}

          {formData.fieldType === 'SELECT' && formData.options.length > 0 && (
            <select
              value={formData.defaultValue || ''}
              onChange={(e) => handleInputChange('defaultValue', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">No default value</option>
              {formData.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>

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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Field' : 'Create Field'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
