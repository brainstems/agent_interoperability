'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
// import { validateForm } from '@/lib/validation' // Temporarily disabled
import {
  Cog6ToothIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface WorkflowFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  workflow?: any
  isEditing?: boolean
}

const triggerTypes = [
  { value: 'NEW_MEMBER', label: 'New Member' },
  { value: 'NEW_VISITOR', label: 'New Visitor' },
  { value: 'MEMBER_ABSENT', label: 'Member Absent' },
  { value: 'DONATION_RECEIVED', label: 'Donation Received' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'ANNIVERSARY', label: 'Anniversary' },
  { value: 'EVENT_REGISTRATION', label: 'Event Registration' },
  { value: 'VOLUNTEER_SIGNUP', label: 'Volunteer Signup' }
]

const stepTypes = [
  { value: 'EMAIL', label: 'Send Email' },
  { value: 'SMS', label: 'Send SMS' },
  { value: 'TASK', label: 'Create Task' },
  { value: 'NOTIFICATION', label: 'Send Notification' },
  { value: 'WAIT', label: 'Wait Period' },
  { value: 'CONDITION', label: 'Conditional Branch' }
]

const actionTypes = [
  { value: 'SEND_WELCOME_EMAIL', label: 'Send Welcome Email' },
  { value: 'SEND_FOLLOW_UP_EMAIL', label: 'Send Follow-up Email' },
  { value: 'SEND_BIRTHDAY_GREETING', label: 'Send Birthday Greeting' },
  { value: 'CREATE_FOLLOW_UP_TASK', label: 'Create Follow-up Task' },
  { value: 'SEND_DONATION_RECEIPT', label: 'Send Donation Receipt' },
  { value: 'ASSIGN_TO_SMALL_GROUP', label: 'Assign to Small Group' },
  { value: 'SCHEDULE_PASTORAL_VISIT', label: 'Schedule Pastoral Visit' }
]

export default function WorkflowForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  workflow, 
  isEditing = false 
}: WorkflowFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'NEW_MEMBER',
    triggerConditions: {},
    isActive: true,
    steps: [] as any[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (isEditing && workflow) {
        setFormData({
          name: workflow.name || '',
          description: workflow.description || '',
          triggerType: workflow.triggerType || 'NEW_MEMBER',
          triggerConditions: workflow.triggerConditions || {},
          isActive: workflow.isActive !== undefined ? workflow.isActive : true,
          steps: workflow.steps || []
        })
      } else {
        setFormData({
          name: '',
          description: '',
          triggerType: 'NEW_MEMBER',
          triggerConditions: {},
          isActive: true,
          steps: []
        })
      }
      setErrors({})
    }
  }, [isOpen, isEditing, workflow])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      stepOrder: formData.steps.length + 1,
      stepType: 'EMAIL',
      actionType: 'SEND_WELCOME_EMAIL',
      actionData: {},
      delayDays: 0,
      conditions: {}
    }
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
  }

  const updateStep = (stepIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === stepIndex ? { ...step, [field]: value } : step
      )
    }))
  }

  const removeStep = (stepIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
        .map((step, index) => ({ ...step, stepOrder: index + 1 }))
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      validationErrors.name = 'Workflow name is required'
    }
    if (!formData.triggerType) {
      validationErrors.triggerType = 'Trigger type is required'
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Workflow' : 'Create Workflow'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Cog6ToothIcon className="h-4 w-4 inline mr-1" />
              Workflow Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter workflow name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              placeholder="Describe what this workflow does"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger Type *
            </label>
            <select
              value={formData.triggerType}
              onChange={(e) => handleInputChange('triggerType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {triggerTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.triggerType && <p className="text-red-500 text-sm mt-1">{errors.triggerType}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              <PlayIcon className="h-4 w-4 inline mr-1" />
              Active workflow
            </label>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Workflow Steps</h3>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Step
            </button>
          </div>

          {formData.steps.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No steps added yet. Click "Add Step" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.steps.map((step, index) => (
                <div key={step.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium mr-2">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900">Step {index + 1}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Step Type
                      </label>
                      <select
                        value={step.stepType}
                        onChange={(e) => updateStep(index, 'stepType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {stepTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action
                      </label>
                      <select
                        value={step.actionType}
                        onChange={(e) => updateStep(index, 'actionType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {actionTypes.map(action => (
                          <option key={action.value} value={action.value}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Delay (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={step.delayDays}
                      onChange={(e) => updateStep(index, 'delayDays', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {index < formData.steps.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 transform rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {errors.submit && (
          <div className="text-red-500 text-sm">{errors.submit}</div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Workflow' : 'Create Workflow')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
