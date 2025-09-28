'use client'

import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'

interface GroupFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (groupData: any) => Promise<void>
  group?: any
  isEditing?: boolean
}

export default function GroupForm({ isOpen, onClose, onSubmit, group, isEditing = false }: GroupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupType: 'SMALL_GROUP',
    meetingDay: '',
    meetingTime: '',
    location: '',
    capacity: '',
    isActive: true,
    requiresRegistration: false,
    ageGroup: '',
    leader: '',
    coLeader: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (group && isEditing) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        groupType: group.groupType || 'SMALL_GROUP',
        meetingDay: group.meetingDay || '',
        meetingTime: group.meetingTime || '',
        location: group.location || '',
        capacity: group.capacity?.toString() || '',
        isActive: group.isActive ?? true,
        requiresRegistration: group.requiresRegistration ?? false,
        ageGroup: group.ageGroup || '',
        leader: group.leader || '',
        coLeader: group.coLeader || '',
        contactEmail: group.contactEmail || '',
        contactPhone: group.contactPhone || '',
        notes: group.notes || ''
      })
    }
  }, [group, isEditing])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation
    const validationErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      validationErrors.name = 'Group name is required'
    }
    if (!formData.groupType) {
      validationErrors.groupType = 'Group type is required'
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      const groupData = {
        name: formData.name,
        description: formData.description,
        groupType: formData.groupType,
        meetingDay: formData.meetingDay || null,
        meetingTime: formData.meetingTime || null,
        location: formData.location || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        isActive: formData.isActive,
        requiresRegistration: formData.requiresRegistration,
        ageGroup: formData.ageGroup || null,
        leader: formData.leader || null,
        coLeader: formData.coLeader || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        notes: formData.notes || null
      }

      await onSubmit(groupData)
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save group' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Group' : 'Create New Group'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{errors.submit}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter group name"
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Group Type */}
          <div>
            <label htmlFor="groupType" className="block text-sm font-medium text-gray-700 mb-2">
              Group Type *
            </label>
            <select
              id="groupType"
              value={formData.groupType}
              onChange={(e) => handleInputChange('groupType', e.target.value)}
              className="form-select"
            >
              <option value="SMALL_GROUP">Small Group</option>
              <option value="MINISTRY">Ministry</option>
              <option value="COMMITTEE">Committee</option>
              <option value="CLASS">Class</option>
              <option value="CHOIR">Choir</option>
              <option value="YOUTH">Youth Group</option>
              <option value="MENS">Men's Group</option>
              <option value="WOMENS">Women's Group</option>
              <option value="SENIORS">Seniors</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Meeting Day */}
          <div>
            <label htmlFor="meetingDay" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Day
            </label>
            <select
              id="meetingDay"
              value={formData.meetingDay}
              onChange={(e) => handleInputChange('meetingDay', e.target.value)}
              className="form-select"
            >
              <option value="">Select a day</option>
              <option value="SUNDAY">Sunday</option>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
            </select>
          </div>

          {/* Meeting Time */}
          <div>
            <label htmlFor="meetingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Time
            </label>
            <Input
              id="meetingTime"
              type="time"
              value={formData.meetingTime}
              onChange={(e) => handleInputChange('meetingTime', e.target.value)}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Meeting location"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="form-textarea"
              placeholder="Group description and purpose"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Group' : 'Create Group')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
