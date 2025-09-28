'use client'

import React, { useState } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { useNotification } from '@/contexts/NotificationContext'

interface TagFormData {
  name: string
  displayName: string
  description: string
  tagType: string
  color: string
  icon: string
  isActive: boolean
  isPublic: boolean
  autoAssign: boolean
  autoRemove: boolean
  category: string
}

interface TagFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TagFormData) => Promise<void>
  tag?: Partial<TagFormData>
  isEditing?: boolean
}

const initialFormData: TagFormData = {
  name: '',
  displayName: '',
  description: '',
  tagType: 'MANUAL',
  color: 'BLUE',
  icon: '',
  isActive: true,
  isPublic: true,
  autoAssign: false,
  autoRemove: false,
  category: ''
}

const tagTypes = [
  { value: 'MANUAL', label: 'Manual', description: 'Manually assigned by staff' },
  { value: 'AUTOMATIC', label: 'Automatic', description: 'Assigned by rules and conditions' },
  { value: 'COMPUTED', label: 'Computed', description: 'Calculated based on member data' },
  { value: 'SYSTEM', label: 'System', description: 'System-generated tags' }
]

const tagColors = [
  { value: 'RED', label: 'Red', class: 'bg-red-400' },
  { value: 'BLUE', label: 'Blue', class: 'bg-blue-400' },
  { value: 'GREEN', label: 'Green', class: 'bg-green-400' },
  { value: 'YELLOW', label: 'Yellow', class: 'bg-yellow-400' },
  { value: 'PURPLE', label: 'Purple', class: 'bg-purple-400' },
  { value: 'ORANGE', label: 'Orange', class: 'bg-orange-400' },
  { value: 'PINK', label: 'Pink', class: 'bg-pink-400' },
  { value: 'GRAY', label: 'Gray', class: 'bg-gray-400' }
]

const commonIcons = [
  '⭐', '🏠', '👨‍👩‍👧‍👦', '🎓', '💼', '🎵', '🙏', '❤️', '🎯', '🌟',
  '📚', '🎨', '⚽', '🎪', '🔧', '🍎', '🌱', '🎁', '🔥', '💡'
]

export default function TagForm({ isOpen, onClose, onSubmit, tag, isEditing = false }: TagFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<TagFormData>({
    ...initialFormData,
    ...tag
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof TagFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const generateTagName = (displayName: string) => {
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
      newErrors.name = 'Tag name is required'
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Tag name must start with a letter and contain only lowercase letters, numbers, and underscores'
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
    } catch (error) {
      console.error('Form submission error:', error)
      showError(
        isEditing ? 'Update Failed' : 'Creation Failed',
        error instanceof Error ? error.message : 'Failed to save tag. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onClose()
  }

  const selectedTagType = tagTypes.find(type => type.value === formData.tagType)
  const selectedColor = tagColors.find(color => color.value === formData.color)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Tag' : 'Create Tag'}
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
                  // Auto-generate tag name if not editing
                  if (!isEditing) {
                    handleInputChange('name', generateTagName(e.target.value))
                  }
                }}
                className={errors.displayName ? 'border-red-300' : ''}
                placeholder="e.g., New Member"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-300' : ''}
                placeholder="e.g., new_member"
                disabled={isEditing} // Don't allow changing tag name when editing
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
              placeholder="Optional description for this tag"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Type *
              </label>
              <select
                value={formData.tagType}
                onChange={(e) => handleInputChange('tagType', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {tagTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedTagType && (
                <p className="mt-1 text-xs text-gray-500">
                  {selectedTagType.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g., Ministry, Demographics"
              />
            </div>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Visual Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {tagColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleInputChange('color', color.value)}
                    className={`p-3 rounded-md border-2 flex items-center justify-center ${
                      formData.color === color.value
                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${color.class}`}></div>
                  </button>
                ))}
              </div>
              {selectedColor && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {selectedColor.label}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (Optional)
              </label>
              <Input
                type="text"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="Enter emoji or icon"
                className="mb-2"
              />
              <div className="grid grid-cols-10 gap-1">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleInputChange('icon', icon)}
                    className={`p-1 text-lg rounded hover:bg-gray-100 ${
                      formData.icon === icon ? 'bg-indigo-100' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tag Properties */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Tag Properties</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Active tag
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

            {formData.tagType === 'AUTOMATIC' && (
              <>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoAssign}
                    onChange={(e) => handleInputChange('autoAssign', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Automatically assign to matching members
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoRemove}
                    onChange={(e) => handleInputChange('autoRemove', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Automatically remove from non-matching members
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Preview</h3>
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${selectedColor?.class || 'bg-blue-400'}`}></div>
              {formData.icon && <span className="text-sm">{formData.icon}</span>}
              <span className="text-sm font-medium">
                {formData.displayName || 'Tag Name'}
              </span>
              <span className="text-xs text-gray-500">
                ({formData.tagType.toLowerCase()})
              </span>
            </div>
          </div>
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Tag' : 'Create Tag'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
