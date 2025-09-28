'use client'

import React, { useState } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { useNotification } from '@/contexts/NotificationContext'

interface TagRuleFormData {
  name: string
  description: string
  tagId: string
  isActive: boolean
  ruleOperator: string
  runFrequency: string
  conditions: any[]
}

interface TagRuleFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TagRuleFormData) => Promise<void>
  rule?: Partial<TagRuleFormData>
  isEditing?: boolean
  availableTags: any[]
}

const initialFormData: TagRuleFormData = {
  name: '',
  description: '',
  tagId: '',
  isActive: true,
  ruleOperator: 'AND',
  runFrequency: 'daily',
  conditions: []
}

export default function TagRuleForm({ isOpen, onClose, onSubmit, rule, isEditing = false, availableTags }: TagRuleFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState<TagRuleFormData>({
    ...initialFormData,
    ...rule
  })

  const handleClose = () => {
    setFormData(initialFormData)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Tag Rule' : 'Create Tag Rule'}
      size="lg"
    >
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Tag Rule Builder
        </h3>
        <p className="text-gray-500 mb-6">
          Advanced rule builder coming soon. This will allow you to create complex conditions
          for automatic tag assignment based on member data, attendance patterns, giving history,
          and more.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., New Members Last 30 Days"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Tag
            </label>
            <select
              value={formData.tagId}
              onChange={(e) => setFormData(prev => ({ ...prev, tagId: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a tag</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe what this rule does..."
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled
            className="opacity-50"
          >
            Coming Soon
          </Button>
        </div>
      </div>
    </Modal>
  )
}
