'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import { useNotification } from '@/contexts/NotificationContext'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AuditLog {
  id: string
  churchId: string
  userId: string
  userName?: string
  action: string
  resourceType: string
  resourceId?: string
  resourceName?: string
  severity: string
  description: string
  ipAddress?: string
  userAgent?: string
  oldValues?: any
  newValues?: any
  metadata?: any
  createdAt: string
}

interface SecurityEvent {
  id: string
  churchId: string
  userId?: string
  userName?: string
  eventType: string
  severity: string
  description: string
  ipAddress?: string
  userAgent?: string
  additionalData?: any
  createdAt: string
}

interface AuditStats {
  totalEvents: number
  todayEvents: number
  securityEvents: number
  highSeverityEvents: number
  topUsers: Array<{ userId: string; userName: string; eventCount: number }>
  topActions: Array<{ action: string; count: number }>
}

export default function AuditPage() {
  const { showSuccess, showError } = useNotification()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7')
  const [activeTab, setActiveTab] = useState('logs')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    fetchAuditData()
  }, [actionFilter, severityFilter, dateRange])

  const fetchAuditData = async () => {
    try {
      const params = new URLSearchParams({
        dateRange,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(severityFilter !== 'all' && { severity: severityFilter })
      })

      const [logsResponse, securityResponse, statsResponse] = await Promise.all([
        fetch(`/api/audit/logs?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/audit/security?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/audit/stats?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setAuditLogs(logsData.data || [])
      }

      if (securityResponse.ok) {
        const securityData = await securityResponse.json()
        setSecurityEvents(securityData.data || [])
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Failed to fetch audit data:', error)
      showError('Error', 'Failed to load audit data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'CRITICAL': 'bg-red-100 text-red-800'
    }
    return colors[severity] || 'bg-gray-100 text-gray-800'
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'VIEW': 'bg-gray-100 text-gray-800',
      'LOGIN': 'bg-indigo-100 text-indigo-800',
      'LOGOUT': 'bg-purple-100 text-purple-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const filteredLogs = auditLogs.filter(log =>
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSecurityEvents = securityEvents.filter(event =>
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 loading-skeleton w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 loading-skeleton"></div>
            ))}
          </div>
          <div className="h-10 loading-skeleton"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 loading-skeleton"></div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Audit & Security Logs"
          subtitle="Monitor all system activities, data changes, and security events."
        >
          <div className="flex space-x-3">
            <Button variant="outline">
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Total Events</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Today</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.todayEvents}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldExclamationIcon className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Security Events</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.securityEvents}</div>
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
                    <div className="text-sm font-medium text-gray-500">High Severity</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.highSeverityEvents}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-4 w-4 inline mr-2" />
              Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShieldExclamationIcon className="h-4 w-4 inline mr-2" />
              Security Events ({securityEvents.length})
            </button>
          </nav>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
                  </div>
                  <Input
                    type="text"
                    className="pl-10"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="all">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="VIEW">View</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="all">All Severity</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Audit Logs Tab */}
        {activeTab === 'logs' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-secondary-500">
                      {formatTimestamp(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-secondary-400" />
                        {log.userName || 'System'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadge(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-secondary-900">
                          {log.resourceType}
                        </div>
                        {log.resourceName && (
                          <div className="text-sm text-secondary-500">
                            {log.resourceName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityBadge(log.severity)}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-secondary-500 max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria or date range.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Security Events Tab */}
        {activeTab === 'security' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSecurityEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm text-secondary-500">
                      {formatTimestamp(event.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-secondary-400" />
                        {event.userName || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-800">
                        {event.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityBadge(event.severity)}>
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {event.description}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-500">
                      {event.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSecurityEvents.length === 0 && (
              <div className="text-center py-12">
                <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No security events found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This is good news! No security incidents have been detected.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <div className="text-sm text-gray-900">{formatTimestamp(selectedLog.createdAt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <div className="text-sm text-gray-900">{selectedLog.userName || 'System'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <Badge className={getActionBadge(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <Badge className={getSeverityBadge(selectedLog.severity)}>
                      {selectedLog.severity}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <div className="text-sm text-gray-900">{selectedLog.description}</div>
                </div>

                {selectedLog.resourceName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource</label>
                    <div className="text-sm text-gray-900">
                      {selectedLog.resourceType}: {selectedLog.resourceName}
                    </div>
                  </div>
                )}

                {selectedLog.ipAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <div className="text-sm text-gray-900">{selectedLog.ipAddress}</div>
                  </div>
                )}

                {(selectedLog.oldValues || selectedLog.newValues) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Changes</label>
                    <div className="mt-2 bg-gray-50 rounded-md p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify({ 
                          old: selectedLog.oldValues, 
                          new: selectedLog.newValues 
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
