'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import DonationForm from '@/components/forms/DonationForm'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  EllipsisVerticalIcon,
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface Donation {
  id: string
  amount: number
  donationDate: string
  paymentMethod: string
  member: {
    firstName: string
    lastName: string
  }
  fund: {
    name: string
  }
}

interface GivingStats {
  totalThisMonth: number
  totalLastMonth: number
  averageGift: number
  donorCount: number
  monthlyGrowth: number
}

export default function GivingPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null)
  const [stats, setStats] = useState<GivingStats | null>(null)
  const [timeFilter, setTimeFilter] = useState('month')

  useEffect(() => {
    fetchGivingData()
  }, [timeFilter])

  const fetchDonations = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(dateFilter !== 'all' && { dateRange: dateFilter })
      })

      const response = await fetch(`/api/donations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDonations(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch donations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDonation = async (donationData: any) => {
    const response = await fetch('/api/donations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(donationData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to record donation')
    }

    await fetchDonations()
  }

  const handleEditDonation = async (donationData: any) => {
    if (!editingDonation) return

    const response = await fetch(`/api/donations/${editingDonation.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(donationData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update donation')
    }

    await fetchDonations()
    setEditingDonation(null)
  }

  const openEditForm = (donation: Donation) => {
    setEditingDonation(donation)
    setShowDonationForm(true)
  }

  const closeForm = () => {
    setShowDonationForm(false)
    setEditingDonation(null)
  }

  const fetchGivingData = async () => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        period: timeFilter
      })

      const response = await fetch(`/api/donations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch giving data:', error)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <BanknotesIcon className="h-4 w-4" />
      case 'check':
        return <BanknotesIcon className="h-4 w-4" />
      case 'credit_card':
        return <CreditCardIcon className="h-4 w-4" />
      case 'online':
        return <DevicePhoneMobileIcon className="h-4 w-4" />
      default:
        return <CurrencyDollarIcon className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Giving</h1>
            <p className="mt-2 text-sm text-gray-700">
              Track donations, manage funds, and analyze giving patterns.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-1" />
              Reports
            </button>
            <button
              type="button"
              onClick={() => setShowDonationForm(true)}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Record Donation
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center p-3 rounded-md bg-green-500">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(stats?.totalThisMonth || 0)}
                      </div>
                      {stats?.monthlyGrowth !== undefined && stats.monthlyGrowth !== 0 && (
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stats.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.monthlyGrowth > 0 ? (
                            <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                          )}
                          {Math.abs(stats.monthlyGrowth)}%
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center p-3 rounded-md bg-blue-500">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Average Gift</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(stats?.averageGift || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center p-3 rounded-md bg-purple-500">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Donors</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stats?.donorCount || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center p-3 rounded-md bg-orange-500">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Last Month</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(stats?.totalLastMonth || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Recent Donations */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center mb-6">
              <div className="sm:flex-auto">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">Recent Donations</h3>
              </div>
              <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <select
                  className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Donor
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Fund
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Method
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {donation.member.firstName} {donation.member.lastName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-green-600">
                        {formatCurrency(donation.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {donation.fund.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          {getPaymentMethodIcon(donation.paymentMethod)}
                          <span className="ml-2 capitalize">{donation.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(donation.donationDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {donations.length === 0 && (
                <div className="text-center py-12">
                  <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No donations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by recording your first donation.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Record Donation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights for Giving */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 shadow rounded-lg border border-green-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-green-900 mb-4">Giving Insights</h3>
            <div className="space-y-3">
              <div className="bg-white/60 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Trend Analysis:</strong> Monthly giving has increased 8% compared to last month. Strong stewardship growth!
                </p>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Donor Engagement:</strong> 15 new first-time donors this month. Consider sending personalized thank-you notes.
                </p>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Seasonal Pattern:</strong> Giving typically increases 25% in December. Plan year-end campaign accordingly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Donation Form Modal */}
      <DonationForm
        isOpen={showDonationForm}
        onClose={closeForm}
        onSubmit={editingDonation ? handleEditDonation : handleCreateDonation}
        donation={editingDonation || undefined}
        isEditing={!!editingDonation}
      />
    </Layout>
  )
}
