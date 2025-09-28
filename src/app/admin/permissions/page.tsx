'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import { useNotification } from '@/contexts/NotificationContext'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  permissions: string[]
  isSystem: boolean
  userCount: number
  createdAt: string
  updatedAt: string
}

interface Permission {
  id: string
  name: string
  displayName: string
  description?: string
  category: string
  isSystem: boolean
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

const PERMISSION_CATEGORIES = [
  'Member Management',
  'Event Management',
  'Financial Management',
  'Communication',
  'Reporting',
  'System Administration',
  'Custom Fields',
  'Tags & Automation',
  'Security & Audit'
]

export default function PermissionsPage() {
  const { showSuccess, showError } = useNotification()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('roles')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showRoleForm, setShowRoleForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/roles', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/admin/permissions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData.data || [])
      }

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json()
        setPermissions(permissionsData.data || [])
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      showError('Error', 'Failed to load permissions data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user role')
      }

      await fetchData()
      showSuccess('Success', 'User role updated successfully')
    } catch (error) {
      console.error('Failed to update user role:', error)
      showError('Error', 'Failed to update user role')
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'CLERGY': 'bg-purple-100 text-purple-800',
      'STAFF': 'bg-blue-100 text-blue-800',
      'VOLUNTEER': 'bg-green-100 text-green-800',
      'MEMBER': 'bg-gray-100 text-gray-800',
      'VISITOR': 'bg-yellow-100 text-yellow-800'
    }
    return colors[roleName] || 'bg-gray-100 text-gray-800'
  }

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(p => p.category === category)
  }

  const filteredRoles = roles.filter(role =>
    role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 loading-skeleton w-1/4"></div>
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
          title="Permissions & Access Control"
          subtitle="Manage user roles, permissions, and access controls for your church management system."
        >
          <div className="flex space-x-3">
            <Button variant="outline">
              <KeyIcon className="h-4 w-4 mr-2" />
              Export Permissions
            </Button>
          </div>
        </PageHeader>

        {/* Security Warning */}
        <Card>
          <div className="p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Changes to permissions and roles affect system security. Only administrators should modify these settings.
                    All changes are logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'roles'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShieldCheckIcon className="h-4 w-4 inline mr-2" />
              Roles ({roles.length})
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'permissions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <KeyIcon className="h-4 w-4 inline mr-2" />
              Permissions ({permissions.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserGroupIcon className="h-4 w-4 inline mr-2" />
              User Access ({users.length})
            </button>
          </nav>
        </div>

        {/* Search */}
        <Card>
          <div className="p-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
              </div>
              <Input
                type="text"
                className="pl-10"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-secondary-900">
                          {role.displayName}
                        </div>
                        {role.description && (
                          <div className="text-secondary-500 text-sm">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1 text-secondary-400" />
                        {role.userCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <KeyIcon className="h-4 w-4 mr-1 text-secondary-400" />
                        {role.permissions.length}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={role.isSystem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                        {role.isSystem ? 'System' : 'Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {new Date(role.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRole(role)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredRoles.length === 0 && (
              <div className="text-center py-12">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {PERMISSION_CATEGORIES.map((category) => {
              const categoryPermissions = getPermissionsByCategory(category)
              if (categoryPermissions.length === 0) return null

              return (
                <Card key={category}>
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {permission.displayName}
                              </h4>
                              {permission.description && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {permission.description}
                                </p>
                              )}
                              <div className="mt-2">
                                <Badge className={permission.isSystem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                                  {permission.isSystem ? 'System' : 'Custom'}
                                </Badge>
                              </div>
                            </div>
                            <LockClosedIcon className="h-4 w-4 text-gray-400 ml-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="relative">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-secondary-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-secondary-500 text-sm">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-secondary-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="CLERGY">Clergy</option>
                        <option value="STAFF">Staff</option>
                        <option value="VOLUNTEER">Volunteer</option>
                        <option value="MEMBER">Member</option>
                        <option value="VISITOR">Visitor</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Role Details Modal */}
        {selectedRole && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Role: {selectedRole.displayName}
                  </h3>
                  <button
                    onClick={() => setSelectedRole(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRole.description || 'No description provided'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions ({selectedRole.permissions.length})
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      <div className="p-3 space-y-2">
                        {selectedRole.permissions.map((permissionName) => {
                          const permission = permissions.find(p => p.name === permissionName)
                          return (
                            <div key={permissionName} className="flex items-center justify-between py-1">
                              <span className="text-sm text-gray-900">
                                {permission?.displayName || permissionName}
                              </span>
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Granted
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRole.isSystem ? 'System Role' : 'Custom Role'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Users</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRole.userCount} users assigned
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRole(null)}
                  >
                    Close
                  </Button>
                  {!selectedRole.isSystem && (
                    <Button>
                      Edit Role
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
