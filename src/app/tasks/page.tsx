'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import TaskForm from '@/components/forms/TaskForm'
import { formatDate } from '@/lib/utils'
import { 
  PlusIcon, 
  FunnelIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface Task {
  id: string
  title: string
  description?: string
  taskType: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  assignedTo: string
  createdBy: string
  memberId?: string
  dueDate?: string
  notes?: string
  createdAt: string
  completedAt?: string
  assignee: {
    id: string
    email: string
  }
  creator: {
    id: string
    email: string
  }
  member?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
}

const taskTypes = [
  'FOLLOW_UP_CALL',
  'VISIT',
  'EMAIL',
  'PRAYER_REQUEST',
  'PASTORAL_CARE',
  'VOLUNTEER_COORDINATION',
  'EVENT_PLANNING',
  'ADMINISTRATIVE'
]

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800'
}

const statusColors = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  })

  useEffect(() => {
    fetchTasks()
  }, [currentPage, searchTerm, statusFilter, priorityFilter, typeFilter])

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/tasks?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const taskData = data.data || []
        setTasks(taskData)
        setTotalPages(data.pagination?.totalPages || 1)
        calculateStats(taskData)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (taskData: any) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(taskData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create task')
    }

    await fetchTasks()
  }

  const handleEditTask = async (taskData: any) => {
    if (!editingTask) return

    const response = await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(taskData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update task')
    }

    await fetchTasks()
    setEditingTask(null)
  }

  const openEditForm = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  const closeForm = () => {
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const calculateStats = (taskData: Task[]) => {
    const now = new Date()
    const stats = {
      total: taskData.length,
      pending: taskData.filter(t => t.status === 'PENDING').length,
      inProgress: taskData.filter(t => t.status === 'IN_PROGRESS').length,
      completed: taskData.filter(t => t.status === 'COMPLETED').length,
      overdue: taskData.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED'
      ).length
    }
    setStats(stats)
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'COMPLETED'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Task Management"
          subtitle="Manage follow-ups, pastoral care, and administrative tasks"
        >
          <Button
            onClick={() => setShowTaskForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Total Tasks</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Pending</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">In Progress</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Completed</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Overdue</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.overdue}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FunnelIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
                  </div>
                  <Input
                    type="text"
                    className="pl-10"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {taskTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        <Card>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-secondary-900">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-secondary-500 text-sm truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                        {task.member && (
                          <div className="text-secondary-400 text-xs">
                            Member: {task.member.firstName} {task.member.lastName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">
                        {task.taskType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={statusColors[task.status]}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.dueDate && isOverdue(task.dueDate, task.status) && (
                          <Badge className="bg-red-100 text-red-800">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {task.assignee.email}
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {task.dueDate ? formatDate(task.dueDate) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {task.status !== 'COMPLETED' && (
                          <>
                            {task.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(task)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {tasks.length === 0 && !loading && (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new task.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Task Form Modal */}
        <TaskForm
          isOpen={showTaskForm}
          onClose={closeForm}
          onSubmit={editingTask ? handleEditTask : handleCreateTask}
          task={editingTask || undefined}
          isEditing={!!editingTask}
        />
      </div>
    </Layout>
  )
}
