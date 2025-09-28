'use client'

import React, { useState, useEffect } from 'react'
import { Button, Input } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { useNotification } from '@/contexts/NotificationContext'

interface DonationFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (donationData: any) => Promise<void>
  donation?: any
  isEditing?: boolean
}

export default function DonationForm({ isOpen, onClose, onSubmit, donation, isEditing = false }: DonationFormProps) {
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState({
    donorName: donation?.donorName || '',
    donorEmail: donation?.donorEmail || '',
    donorPhone: donation?.donorPhone || '',
    amount: donation?.amount ? donation.amount.toString() : '',
    donationType: donation?.donationType || 'tithe',
    paymentMethod: donation?.paymentMethod || 'cash',
    donationDate: donation?.donationDate ? new Date(donation.donationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    campaign: donation?.campaign || '',
    fund: donation?.fund || 'general',
    isAnonymous: donation?.isAnonymous || false,
    isRecurring: donation?.isRecurring || false,
    recurringFrequency: donation?.recurringFrequency || 'monthly',
    taxDeductible: donation?.taxDeductible !== undefined ? donation.taxDeductible : true,
    notes: donation?.notes || '',
    receiptRequested: donation?.receiptRequested !== undefined ? donation.receiptRequested : true,
    acknowledgmentSent: donation?.acknowledgmentSent || false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (donation && isEditing) {
      const donationDate = donation.donationDate ? new Date(donation.donationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      
      setFormData({
        donorName: donation.donorName || '',
        donorEmail: donation.donorEmail || '',
        donorPhone: donation.donorPhone || '',
        amount: donation.amount ? donation.amount.toString() : '',
        donationType: donation.donationType || 'tithe',
        paymentMethod: donation.paymentMethod || 'cash',
        donationDate: donationDate,
        campaign: donation.campaign || '',
        fund: donation.fund || 'general',
        isAnonymous: donation.isAnonymous || false,
        isRecurring: donation.isRecurring || false,
        recurringFrequency: donation.recurringFrequency || 'monthly',
        taxDeductible: donation.taxDeductible !== undefined ? donation.taxDeductible : true,
        notes: donation.notes || '',
        receiptRequested: donation.receiptRequested !== undefined ? donation.receiptRequested : true,
        acknowledgmentSent: donation.acknowledgmentSent || false
      })
    } else {
      // Reset form for new donation
      setFormData({
        donorName: '',
        donorEmail: '',
        donorPhone: '',
        amount: '',
        donationType: 'tithe',
        paymentMethod: 'cash',
        donationDate: new Date().toISOString().split('T')[0],
        campaign: '',
        fund: 'general',
        isAnonymous: false,
        isRecurring: false,
        recurringFrequency: 'monthly',
        taxDeductible: true,
        notes: '',
        receiptRequested: true,
        acknowledgmentSent: false
      })
    }
    setErrors({})
  }, [donation, isEditing, isOpen])

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
    const validationErrors: Record<string, string> = {}
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      validationErrors.amount = 'Amount must be greater than 0'
    }
    if (!formData.isAnonymous && !formData.donorName.trim()) {
      validationErrors.donorName = 'Donor name is required'
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    
    try {
      const donationData = {
        donorName: formData.isAnonymous ? 'Anonymous' : formData.donorName,
        donorEmail: formData.isAnonymous ? null : formData.donorEmail || null,
        donorPhone: formData.isAnonymous ? null : formData.donorPhone || null,
        amount: parseFloat(formData.amount),
        donationType: formData.donationType,
        paymentMethod: formData.paymentMethod,
        donationDate: new Date(formData.donationDate).toISOString(),
        campaign: formData.campaign || null,
        fund: formData.fund,
        isAnonymous: formData.isAnonymous,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : null,
        taxDeductible: formData.taxDeductible,
        notes: formData.notes || null,
        receiptRequested: formData.receiptRequested,
        acknowledgmentSent: formData.acknowledgmentSent
      }

      await onSubmit(donationData)
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save donation' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Donation' : 'Record New Donation'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{errors.submit}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anonymous Donation Toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                id="isAnonymous"
                type="checkbox"
                checked={formData.isAnonymous}
                onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isAnonymous" className="ml-2 block text-sm text-gray-900">
                Anonymous Donation
              </label>
            </div>
          </div>

          {/* Donor Information - Hidden if anonymous */}
          {!formData.isAnonymous && (
            <>
              <div>
                <label htmlFor="donorName" className="block text-sm font-medium text-gray-700 mb-2">
                  Donor Name *
                </label>
                <Input
                  id="donorName"
                  value={formData.donorName}
                  onChange={(e) => handleInputChange('donorName', e.target.value)}
                  placeholder="Enter donor name"
                  className={errors.donorName ? 'border-red-300' : ''}
                />
                {errors.donorName && (
                  <p className="mt-1 text-sm text-red-600">{errors.donorName}</p>
                )}
              </div>

              <div>
                <label htmlFor="donorEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Donor Email
                </label>
                <Input
                  id="donorEmail"
                  type="email"
                  value={formData.donorEmail}
                  onChange={(e) => handleInputChange('donorEmail', e.target.value)}
                  placeholder="Enter donor email"
                  className={errors.donorEmail ? 'border-red-300' : ''}
                />
                {errors.donorEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.donorEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="donorPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Donor Phone
                </label>
                <Input
                  id="donorPhone"
                  type="tel"
                  value={formData.donorPhone}
                  onChange={(e) => handleInputChange('donorPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={errors.donorPhone ? 'border-red-300' : ''}
                />
                {errors.donorPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.donorPhone}</p>
                )}
              </div>
            </>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount ($) *
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              min="0"
              className={errors.amount ? 'border-red-300' : ''}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Donation Type */}
          <div>
            <label htmlFor="donationType" className="block text-sm font-medium text-gray-700 mb-2">
              Donation Type *
            </label>
            <select
              id="donationType"
              value={formData.donationType}
              onChange={(e) => handleInputChange('donationType', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="tithe">Tithe</option>
              <option value="offering">Offering</option>
              <option value="special">Special Offering</option>
              <option value="building">Building Fund</option>
              <option value="missions">Missions</option>
              <option value="benevolence">Benevolence</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Donation Date */}
          <div>
            <label htmlFor="donationDate" className="block text-sm font-medium text-gray-700 mb-2">
              Donation Date *
            </label>
            <Input
              id="donationDate"
              type="date"
              value={formData.donationDate}
              onChange={(e) => handleInputChange('donationDate', e.target.value)}
              className={errors.donationDate ? 'border-red-300' : ''}
            />
            {errors.donationDate && (
              <p className="mt-1 text-sm text-red-600">{errors.donationDate}</p>
            )}
          </div>

          {/* Fund */}
          <div>
            <label htmlFor="fund" className="block text-sm font-medium text-gray-700 mb-2">
              Fund
            </label>
            <select
              id="fund"
              value={formData.fund}
              onChange={(e) => handleInputChange('fund', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="general">General Fund</option>
              <option value="building">Building Fund</option>
              <option value="missions">Missions Fund</option>
              <option value="youth">Youth Fund</option>
              <option value="music">Music Fund</option>
              <option value="benevolence">Benevolence Fund</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Campaign */}
          <div>
            <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign/Project
            </label>
            <Input
              id="campaign"
              value={formData.campaign}
              onChange={(e) => handleInputChange('campaign', e.target.value)}
              placeholder="Special campaign or project"
              className={errors.campaign ? 'border-red-300' : ''}
            />
            {errors.campaign && (
              <p className="mt-1 text-sm text-red-600">{errors.campaign}</p>
            )}
          </div>

          {/* Recurring Donation */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center">
              <input
                id="isRecurring"
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                Recurring Donation
              </label>
            </div>

            {formData.isRecurring && (
              <div>
                <label htmlFor="recurringFrequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  id="recurringFrequency"
                  value={formData.recurringFrequency}
                  onChange={(e) => handleInputChange('recurringFrequency', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center">
              <input
                id="taxDeductible"
                type="checkbox"
                checked={formData.taxDeductible}
                onChange={(e) => handleInputChange('taxDeductible', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="taxDeductible" className="ml-2 block text-sm text-gray-900">
                Tax Deductible
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="receiptRequested"
                type="checkbox"
                checked={formData.receiptRequested}
                onChange={(e) => handleInputChange('receiptRequested', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="receiptRequested" className="ml-2 block text-sm text-gray-900">
                Receipt Requested
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="acknowledgmentSent"
                type="checkbox"
                checked={formData.acknowledgmentSent}
                onChange={(e) => handleInputChange('acknowledgmentSent', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="acknowledgmentSent" className="ml-2 block text-sm text-gray-900">
                Acknowledgment Sent
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Additional notes about this donation..."
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
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Donation' : 'Record Donation')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
