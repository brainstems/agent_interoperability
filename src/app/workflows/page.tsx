'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import WorkflowForm from '@/components/forms/WorkflowForm'
import { formatDate } from '@/lib/utils'
import { 
  PlusIcon, 
  FunnelIcon, 
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface WorkflowStep {
  id: string
  stepOrder: number
  stepType: string
  actionType: string
  actionData: any
  delayDays: number
  conditions?: any
}

interface Workflow {
  id: string
  churchId: string
  name: string
  description?: string
  triggerType: string
  triggerConditions?: any
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps: WorkflowStep[]
}

const triggerTypes = [
  'NEW_MEMBER',
  'NEW_VISITOR',
  'MEMBER_ABSENT',
  'DONATION_RECEIVED',
  'BIRTHDAY',
  'ANNIVERSARY',
  'EVENT_REGISTRATION',
  'VOLUNTEER_SIGNUP'
]

const stepTypes = [
  'TASK_CREATION',
  'EMAIL_SEND',
  'SMS_SEND',
  'NOTIFICATION',
  'WAIT',
  'CONDITION_CHECK'
]

const actionTypes = [
  'CREATE_FOLLOW_UP_TASK',
  'SEND_WELCOME_EMAIL',
  'SEND_THANK_YOU_EMAIL',
  'SEND_BIRTHDAY_MESSAGE',
  'ASSIGN_PASTORAL_CARE',
  'SCHEDULE_VISIT',
  'ADD_TO_GROUP'
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [triggerFilter, setTriggerFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [currentPage, searchTerm, statusFilter, triggerFilter])

  const fetchWorkflows = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(triggerFilter !== 'all' && { trigger: triggerFilter })
      })

      const response = await fetch(`/api/workflows?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkflow = async (workflowData: any) => {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(workflowData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create workflow')
    }

    await fetchWorkflows()
  }

  const handleEditWorkflow = async (workflowData: any) => {
    if (!editingWorkflow) return

    const response = await fetch(`/api/workflows/${editingWorkflow.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(workflowData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update workflow')
    }

    await fetchWorkflows()
    setEditingWorkflow(null)
  }

  const openEditForm = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setShowWorkflowForm(true)
  }

  const closeForm = () => {
    setShowWorkflowForm(false)
    setEditingWorkflow(null)
  }

  const calculateStats = (workflowData: Workflow[]) => {
    const stats = {
      total: workflowData.length,
      active: workflowData.filter(w => w.isActive).length,
      inactive: workflowData.filter(w => !w.isActive).length,
      totalSteps: workflowData.reduce((sum, w) => sum + w.steps.length, 0)
    }
    return stats
  }

  const toggleWorkflowStatus = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workflowId, isActive })
      })

      if (response.ok) {
        fetchWorkflows()
      }
    } catch (error) {
      console.error('Error updating workflow:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTriggerTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStepTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getActionTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Workflow Builder</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Create automated workflows for member engagement and follow-up
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkflowForm(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Create Workflow
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Cog6ToothIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Workflows</dt>
                      <dd className="text-lg font-medium text-gray-900">{workflows.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <PlayIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                      <dd className="text-lg font-medium text-gray-900">{workflows.filter(w => w.isActive).length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <PauseIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                      <dd className="text-lg font-medium text-gray-900">{workflows.filter(w => !w.isActive).length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowRightIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Steps</dt>
                      <dd className="text-lg font-medium text-gray-900">{workflows.reduce((sum, w) => sum + w.steps.length, 0)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-4">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    value={triggerFilter}
                    onChange={(e) => setTriggerFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="all">All Triggers</option>
                    {triggerTypes.map(type => (
                      <option key={type} value={type}>
                        {getTriggerTypeLabel(type)}
                      </option>
                    ))}
                  </select>

                  <div></div>

                  <button
                    onClick={() => {
                      setStatusFilter('all')
                      setTriggerFilter('all')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workflows List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading workflows...</p>
              </div>
            ) : workflows.length === 0 ? (
              <div className="p-8 text-center">
                <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first automated workflow.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <li key={workflow.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {workflow.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            workflow.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {workflow.steps.length} steps
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Trigger: {getTriggerTypeLabel(workflow.triggerType)}</span>
                          <span>Created: {formatDate(workflow.createdAt)}</span>
                          <span>Updated: {formatDate(workflow.updatedAt)}</span>
                        </div>
                        
                        {workflow.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {workflow.description}
                          </p>
                        )}

                        {/* Workflow Steps Preview */}
                        {workflow.steps.length > 0 && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Steps:</span>
                            <div className="flex items-center space-x-1">
                              {workflow.steps.slice(0, 3).map((step, index) => (
                                <div key={step.id} className="flex items-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {getActionTypeLabel(step.actionType)}
                                  </span>
                                  {index < Math.min(workflow.steps.length - 1, 2) && (
                                    <ArrowRightIcon className="h-3 w-3 text-gray-400 mx-1" />
                                  )}
                                </div>
                              ))}
                              {workflow.steps.length > 3 && (
                                <span className="text-xs text-gray-500">+{workflow.steps.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleWorkflowStatus(workflow.id, !workflow.isActive)}
                          className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded ${
                            workflow.isActive
                              ? 'text-red-700 bg-red-100 hover:bg-red-200'
                              : 'text-green-700 bg-green-100 hover:bg-green-200'
                          }`}
                        >
                          {workflow.isActive ? (
                            <>
                              <PauseIcon className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <PlayIcon className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openEditForm(workflow)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Workflow Form Modal */}
        <WorkflowForm
          isOpen={showWorkflowForm}
          onClose={closeForm}
          onSubmit={editingWorkflow ? handleEditWorkflow : handleCreateWorkflow}
          workflow={editingWorkflow || undefined}
          isEditing={!!editingWorkflow}
        />
      </div>
    </Layout>
  )
}
