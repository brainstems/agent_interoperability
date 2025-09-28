'use client'

import React, { useState } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { validateForm, EventValidationRules, ValidationErrors } from '@/lib/form-validation'
import { useNotification } from '@/contexts/NotificationContext'

interface EventFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (eventData: any) => Promise<void>
  event?: any
  isEditing?: boolean
}

interface EventFormData {
  title: string
  description: string
  eventType: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location: string
  capacity: string
  registrationRequired: boolean
  registrationDeadline: string
  cost: string
  organizer: string
  notes: string
}

const initialFormData: EventFormData = {
  title: '',
  description: '',
  eventType: 'service',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  capacity: '',
  registrationRequired: false,
  registrationDeadline: '',
  cost: '',
  organizer: '',
  notes: ''
}

export default function EventForm({ isOpen, onClose, onSubmit, event, isEditing = false }: EventFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<EventFormData>({
    ...initialFormData,
    ...event
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validationErrors = validateForm(formData, EventValidationRules)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
      showSuccess(
        isEditing ? 'Event Updated' : 'Event Created',
        isEditing ? 'Event details have been successfully updated.' : 'New event has been successfully created and added to the calendar.'
      )
      onClose()
      // Reset form
      setFormData(initialFormData)
      setErrors({})
    } catch (error) {
      console.error('Form submission error:', error)
      showError(
        isEditing ? 'Update Failed' : 'Creation Failed',
        'Failed to save event information. Please try again.'
      )
      setErrors({ submit: 'Failed to save event. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Event' : 'Create New Event'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{errors.submit}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter event title"
              className={errors.title ? 'border-red-300' : ''}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
              Event Type *
            </label>
            <select
              id="eventType"
              value={formData.eventType}
              onChange={(e) => handleInputChange('eventType', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="service">Service</option>
              <option value="meeting">Meeting</option>
              <option value="social">Social Event</option>
              <option value="outreach">Outreach</option>
              <option value="education">Education</option>
              <option value="fundraiser">Fundraiser</option>
              <option value="other">Other</option>
            </select>
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
              placeholder="Enter event location"
              className={errors.location ? 'border-red-300' : ''}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className={errors.startDate ? 'border-red-300' : ''}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className={errors.startTime ? 'border-red-300' : ''}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className={errors.endDate ? 'border-red-300' : ''}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className={errors.endTime ? 'border-red-300' : ''}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
              Capacity
            </label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
              placeholder="Maximum attendees"
              min="1"
              className={errors.capacity ? 'border-red-300' : ''}
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
            )}
          </div>

          {/* Cost */}
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
              Cost ($)
            </label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
              placeholder="0.00"
              min="0"
              className={errors.cost ? 'border-red-300' : ''}
            />
            {errors.cost && (
              <p className="mt-1 text-sm text-red-600">{errors.cost}</p>
            )}
          </div>

          {/* Organizer */}
          <div>
            <label htmlFor="organizer" className="block text-sm font-medium text-gray-700 mb-2">
              Organizer
            </label>
            <Input
              id="organizer"
              value={formData.organizer}
              onChange={(e) => handleInputChange('organizer', e.target.value)}
              placeholder="Event organizer name"
              className={errors.organizer ? 'border-red-300' : ''}
            />
            {errors.organizer && (
              <p className="mt-1 text-sm text-red-600">{errors.organizer}</p>
            )}
          </div>

          {/* Registration Required */}
          <div className="flex items-center">
            <input
              id="registrationRequired"
              type="checkbox"
              checked={formData.registrationRequired}
              onChange={(e) => handleInputChange('registrationRequired', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="registrationRequired" className="ml-2 block text-sm text-gray-900">
              Registration Required
            </label>
          </div>

          {/* Registration Deadline */}
          {formData.registrationRequired && (
            <div>
              <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                Registration Deadline
              </label>
              <Input
                id="registrationDeadline"
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                className={errors.registrationDeadline ? 'border-red-300' : ''}
              />
              {errors.registrationDeadline && (
                <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Event description..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
