'use client'

import React, { useState, useEffect } from 'react'
import { Button, Input, Badge } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { validateForm, MemberValidationRules, ValidationErrors } from '@/lib/form-validation'
import { useNotification } from '@/contexts/NotificationContext'
import { CustomFieldManager } from '@/lib/custom-field-management'
import { DynamicTaggingManager } from '@/lib/dynamic-tagging'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

interface CustomFieldDefinition {
  id: string
  name: string
  displayName: string
  fieldType: string
  isRequired: boolean
  options?: string[]
  defaultValue?: any
  validationRules?: any
}

interface Tag {
  id: string
  name: string
  displayName: string
  color: string
  icon?: string
}

interface MemberFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  birthDate: string
  gender: string
  maritalStatus: string
  memberStatus: string
  customFields: Record<string, any>
  tags: string[]
}

interface MemberFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: MemberFormData) => Promise<void>
  member?: Partial<MemberFormData>
  isEditing?: boolean
}

const initialFormData: MemberFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  memberStatus: 'VISITOR',
  customFields: {},
  tags: []
}

export default function MemberForm({ isOpen, onClose, onSubmit, member, isEditing = false }: MemberFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<MemberFormData>({
    ...initialFormData,
    ...member
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Load custom fields and tags on component mount
  useEffect(() => {
    if (isOpen) {
      loadCustomFields()
      loadAvailableTags()
      if (member?.tags) {
        loadMemberTags(member.tags)
      }
    }
  }, [isOpen, member])

  const loadCustomFields = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/custom-fields/definitions?recordType=MEMBER', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCustomFields(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load custom fields:', error)
    }
  }

  const loadAvailableTags = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const loadMemberTags = async (tagIds: string[]) => {
    const memberTags = availableTags.filter(tag => tagIds.includes(tag.id))
    setSelectedTags(memberTags)
  }

  const handleInputChange = (field: keyof MemberFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }))
  }

  const handleTagAdd = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      const newSelectedTags = [...selectedTags, tag]
      setSelectedTags(newSelectedTags)
      setFormData(prev => ({
        ...prev,
        tags: newSelectedTags.map(t => t.id)
      }))
    }
    setTagSearchTerm('')
    setShowTagDropdown(false)
  }

  const handleTagRemove = (tagId: string) => {
    const newSelectedTags = selectedTags.filter(t => t.id !== tagId)
    setSelectedTags(newSelectedTags)
    setFormData(prev => ({
      ...prev,
      tags: newSelectedTags.map(t => t.id)
    }))
  }

  const filteredTags = availableTags.filter(tag => 
    tag.displayName.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
    !selectedTags.find(t => t.id === tag.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validationErrors = validateForm(formData, MemberValidationRules)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      showSuccess(
        isEditing ? 'Member Updated' : 'Member Created',
        isEditing ? 'Member information has been successfully updated.' : 'New member has been successfully added to the directory.'
      )
      onClose()
      // Reset form
      setFormData(initialFormData)
      setErrors({})
    } catch (error) {
      console.error('Form submission error:', error)
      showError(
        isEditing ? 'Update Failed' : 'Creation Failed',
        'Failed to save member information. Please try again.'
      )
      setErrors({ submit: 'Failed to save member. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    setSelectedTags([])
    setTagSearchTerm('')
    setShowTagDropdown(false)
    setActiveTab('basic')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Member' : 'Add New Member'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <Input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={errors.firstName ? 'border-red-300' : ''}
              placeholder="Enter first name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <Input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={errors.lastName ? 'border-red-300' : ''}
              placeholder="Enter last name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-300' : ''}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={errors.phone ? 'border-red-300' : ''}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <Input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter full address"
          />
        </div>

        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date
            </label>
            <Input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marital Status
            </label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select status</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>
          </div>
        </div>

        {/* Member Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Member Status *
          </label>
          <select
            value={formData.memberStatus}
            onChange={(e) => handleInputChange('memberStatus', e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              errors.memberStatus ? 'border-red-300' : ''
            }`}
          >
            <option value="">Select status</option>
            <option value="VISITOR">Visitor</option>
            <option value="REGULAR_ATTENDEE">Regular Attendee</option>
            <option value="MEMBER">Member</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {errors.memberStatus && (
            <p className="mt-1 text-sm text-red-600">{errors.memberStatus}</p>
          )}
        </div>

        {/* Tabs for Additional Information */}
        <div className="border-t pt-6">
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
              {customFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'custom'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Custom Fields
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('tags')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tags'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tags
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {/* Custom Fields Tab */}
            {activeTab === 'custom' && customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.displayName}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.fieldType === 'TEXT' && (
                      <Input
                        type="text"
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        placeholder={`Enter ${field.displayName.toLowerCase()}`}
                      />
                    )}
                    {field.fieldType === 'NUMBER' && (
                      <Input
                        type="number"
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, parseFloat(e.target.value) || null)}
                        placeholder={`Enter ${field.displayName.toLowerCase()}`}
                      />
                    )}
                    {field.fieldType === 'DATE' && (
                      <Input
                        type="date"
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                      />
                    )}
                    {field.fieldType === 'BOOLEAN' && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.customFields[field.name] || false}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">Yes</span>
                      </div>
                    )}
                    {field.fieldType === 'SELECT' && field.options && (
                      <select
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Select {field.displayName.toLowerCase()}</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {field.fieldType === 'TEXTAREA' && (
                      <textarea
                        value={formData.customFields[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder={`Enter ${field.displayName.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Tags</h3>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          className={`bg-${tag.color.toLowerCase()}-100 text-${tag.color.toLowerCase()}-800 flex items-center gap-1`}
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.displayName}
                          <button
                            type="button"
                            onClick={() => handleTagRemove(tag.id)}
                            className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Tags
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={tagSearchTerm}
                      onChange={(e) => {
                        setTagSearchTerm(e.target.value)
                        setShowTagDropdown(true)
                      }}
                      onFocus={() => setShowTagDropdown(true)}
                      placeholder="Search for tags..."
                      className="pr-10"
                    />
                    <PlusIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Tag Dropdown */}
                  {showTagDropdown && filteredTags.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {filteredTags.slice(0, 10).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagAdd(tag)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          <span className={`inline-block w-3 h-3 rounded-full bg-${tag.color.toLowerCase()}-400`}></span>
                          {tag.displayName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Member' : 'Add Member'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
