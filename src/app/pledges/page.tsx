'use client'

import { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Pledge {
  id: string
  amount: number
  frequency: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate?: string
  totalPaid: number
  remainingAmount: number
  nextPaymentDue?: string
  createdAt: string
  member: {
    firstName: string
    lastName: string
    email: string
  }
  campaign?: {
    name: string
  }
  fund: {
    name: string
  }
}

export default function PledgesPage() {
  const [pledges, setPledges] = useState<Pledge[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showPledgeModal, setShowPledgeModal] = useState(false)
  const [selectedPledge, setSelectedPledge] = useState<Pledge | null>(null)
  const [editingPledge, setEditingPledge] = useState<Pledge | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalPledges: 0,
    activePledges: 0,
    completedPledges: 0,
    totalPledgedAmount: 0,
    totalPaidAmount: 0,
    remainingAmount: 0
  })

  useEffect(() => {
    fetchPledges()
  }, [searchTerm, filterStatus])

  const fetchPledges = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      params.append('include', 'member,campaign,fund')

      const response = await fetch(`/api/pledges?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setPledges(data.pledges)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch pledges:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePledge = async (pledgeData: any) => {
    try {
      const response = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pledgeData)
      })

      if (response.ok) {
        setShowPledgeModal(false)
        setEditingPledge(null)
        fetchPledges()
      }
    } catch (error) {
      console.error('Failed to create pledge:', error)
    }
  }

  const handleUpdatePledge = async (pledgeData: any) => {
    if (!editingPledge) return

    try {
      const response = await fetch('/api/pledges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPledge.id,
          ...pledgeData
        })
      })

      if (response.ok) {
        setShowPledgeModal(false)
        setEditingPledge(null)
        fetchPledges()
      }
    } catch (error) {
      console.error('Failed to update pledge:', error)
    }
  }

  const handleDeletePledge = async (pledgeId: string) => {
    if (!confirm('Are you sure you want to delete this pledge?')) return

    try {
      const response = await fetch('/api/pledges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pledgeId })
      })

      if (response.ok) {
        fetchPledges()
      }
    } catch (error) {
      console.error('Failed to delete pledge:', error)
    }
  }

  const handleUpdateStatus = async (pledgeId: string, status: string) => {
    try {
      const response = await fetch('/api/pledges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pledgeId, status })
      })

      if (response.ok) {
        fetchPledges()
      }
    } catch (error) {
      console.error('Failed to update pledge status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-800 bg-green-100'
      case 'COMPLETED': return 'text-blue-800 bg-blue-100'
      case 'CANCELLED': return 'text-red-800 bg-red-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'ONE_TIME': return 'One Time'
      case 'WEEKLY': return 'Weekly'
      case 'MONTHLY': return 'Monthly'
      case 'QUARTERLY': return 'Quarterly'
      case 'ANNUALLY': return 'Annually'
      default: return frequency
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateProgress = (totalPaid: number, totalAmount: number) => {
    return totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pledge Management</h1>
          <p className="mt-2 text-gray-600">Track and manage member pledges and commitments</p>
        </div>

        {/* Stats Cards - Part 1 */}
        <StatsCards stats={stats} formatCurrency={formatCurrency} />

        {/* Filters and Actions */}
        <FiltersAndActions 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onNewPledge={() => {
            setEditingPledge(null)
            setShowPledgeModal(true)
          }}
        />

        {/* Pledges Table */}
        <PledgesTable 
          pledges={pledges}
          formatCurrency={formatCurrency}
          getFrequencyLabel={getFrequencyLabel}
          getStatusColor={getStatusColor}
          calculateProgress={calculateProgress}
          onView={(pledge) => setSelectedPledge(pledge)}
          onEdit={(pledge) => {
            setEditingPledge(pledge)
            setShowPledgeModal(true)
          }}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeletePledge}
        />

        {/* Modals */}
        {showPledgeModal && (
          <PledgeModal
            pledge={editingPledge}
            onSave={editingPledge ? handleUpdatePledge : handleCreatePledge}
            onClose={() => {
              setShowPledgeModal(false)
              setEditingPledge(null)
            }}
          />
        )}

        {selectedPledge && (
          <PledgeDetailsModal
            pledge={selectedPledge}
            formatCurrency={formatCurrency}
            getFrequencyLabel={getFrequencyLabel}
            calculateProgress={calculateProgress}
            onClose={() => setSelectedPledge(null)}
          />
        )}
      </div>
    </div>
  )
}

// Stats Cards Component
function StatsCards({ stats, formatCurrency }: { stats: any, formatCurrency: (n: number) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Pledges</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPledges}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activePledges}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <ClockIcon className="h-8 w-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completedPledges}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Pledged</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPledgedAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPaidAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <ClockIcon className="h-8 w-8 text-red-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Remaining</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.remainingAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Filters and Actions Component
function FiltersAndActions({ 
  searchTerm, 
  setSearchTerm, 
  filterStatus, 
  setFilterStatus, 
  onNewPledge 
}: {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterStatus: string
  setFilterStatus: (status: string) => void
  onNewPledge: () => void
}) {
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search pledges..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <button
            onClick={onNewPledge}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Pledge
          </button>
        </div>
      </div>
    </div>
  )
}

// Pledges Table Component
function PledgesTable({
  pledges,
  formatCurrency,
  getFrequencyLabel,
  getStatusColor,
  calculateProgress,
  onView,
  onEdit,
  onUpdateStatus,
  onDelete
}: {
  pledges: Pledge[]
  formatCurrency: (amount: number) => string
  getFrequencyLabel: (frequency: string) => string
  getStatusColor: (status: string) => string
  calculateProgress: (paid: number, total: number) => number
  onView: (pledge: Pledge) => void
  onEdit: (pledge: Pledge) => void
  onUpdateStatus: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount & Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fund
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pledges.map((pledge) => (
              <tr key={pledge.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {pledge.member.firstName} {pledge.member.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{pledge.member.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(pledge.amount)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${calculateProgress(pledge.totalPaid, pledge.amount)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatCurrency(pledge.totalPaid)} / {formatCurrency(pledge.amount)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getFrequencyLabel(pledge.frequency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {pledge.campaign && (
                      <div className="text-sm text-blue-600">{pledge.campaign.name}</div>
                    )}
                    <div className="text-sm text-gray-500">{pledge.fund.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pledge.status)}`}>
                    {pledge.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(pledge)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(pledge)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Pledge"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {pledge.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => onUpdateStatus(pledge.id, 'COMPLETED')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Completed"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onUpdateStatus(pledge.id, 'CANCELLED')}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Pledge"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(pledge.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Pledge"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Pledge Modal Component
function PledgeModal({ 
  pledge, 
  onSave, 
  onClose 
}: {
  pledge: Pledge | null
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    memberId: '',
    amount: pledge?.amount || 0,
    frequency: pledge?.frequency || 'MONTHLY',
    fundId: '',
    startDate: pledge?.startDate ? pledge.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: pledge?.endDate ? pledge.endDate.split('T')[0] : '',
    status: pledge?.status || 'ACTIVE'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {pledge ? 'Edit Pledge' : 'Create New Pledge'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member
              </label>
              <input
                type="text"
                required
                placeholder="Search and select member..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as "ONE_TIME" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" })}
                >
                  <option value="ONE_TIME">One Time</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {pledge ? 'Update' : 'Create'} Pledge
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Pledge Details Modal Component
function PledgeDetailsModal({ 
  pledge, 
  formatCurrency,
  getFrequencyLabel,
  calculateProgress,
  onClose 
}: {
  pledge: Pledge
  formatCurrency: (amount: number) => string
  getFrequencyLabel: (frequency: string) => string
  calculateProgress: (paid: number, total: number) => number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pledge Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Member</p>
                <p className="text-sm text-gray-900">{pledge.member.firstName} {pledge.member.lastName}</p>
                <p className="text-xs text-gray-500">{pledge.member.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm text-gray-900">{pledge.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Pledge Amount</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(pledge.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Frequency</p>
                <p className="text-sm text-gray-900">{getFrequencyLabel(pledge.frequency)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${calculateProgress(pledge.totalPaid, pledge.amount)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Paid: {formatCurrency(pledge.totalPaid)}</span>
                <span>Remaining: {formatCurrency(pledge.remainingAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Fund</p>
                <p className="text-sm text-gray-900">{pledge.fund.name}</p>
              </div>
              {pledge.campaign && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaign</p>
                  <p className="text-sm text-gray-900">{pledge.campaign.name}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm text-gray-900">{new Date(pledge.startDate).toLocaleDateString()}</p>
              </div>
              {pledge.endDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="text-sm text-gray-900">{new Date(pledge.endDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {pledge.nextPaymentDue && (
              <div>
                <p className="text-sm font-medium text-gray-500">Next Payment Due</p>
                <p className="text-sm text-gray-900">{new Date(pledge.nextPaymentDue).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
