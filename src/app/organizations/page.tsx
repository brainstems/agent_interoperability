'use client'

import { useState, useEffect } from 'react'
import { 
  BuildingOffice2Icon, 
  PlusIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

interface Organization {
  id: string
  name: string
  organization_type: string
  parent_id: string | null
  description: string
  settings: any
  created_at: string
  children?: Organization[]
  churches_count?: number
  programs_count?: number
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')
      const data = await response.json()
      
      if (data.success) {
        setOrganizations(data.organizations)
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderOrgTree = (orgs: Organization[], level = 0) => {
    return orgs.map(org => (
      <div key={org.id} style={{ marginLeft: `${level * 2}rem` }}>
        <div 
          className="p-4 bg-white border border-gray-200 rounded-lg mb-2 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedOrg(org)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BuildingOffice2Icon className="h-6 w-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-500 capitalize">
                    {org.organization_type?.replace('_', ' ')}
                  </span>
                  {org.churches_count && (
                    <span className="text-sm text-gray-500">
                      {org.churches_count} churches
                    </span>
                  )}
                  {org.programs_count && (
                    <span className="text-sm text-gray-500">
                      {org.programs_count} programs
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation()
                // View details
              }}
            >
              View Details
            </button>
          </div>
        </div>
        
        {org.children && org.children.length > 0 && renderOrgTree(org.children, level + 1)}
      </div>
    ))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600 mt-2">
            Manage diocese, network, and church hierarchy
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Organization</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Organizations</p>
              <p className="text-3xl font-bold mt-1">
                {organizations.length}
              </p>
            </div>
            <BuildingOffice2Icon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Active Programs</p>
              <p className="text-3xl font-bold mt-1">
                {organizations.reduce((sum, org) => sum + (org.programs_count || 0), 0)}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Member Churches</p>
              <p className="text-3xl font-bold mt-1">
                {organizations.reduce((sum, org) => sum + (org.churches_count || 0), 0)}
              </p>
            </div>
            <UsersIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Organization Hierarchy */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Organization Hierarchy
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOffice2Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No organizations found</p>
            <p className="text-gray-400 text-sm mt-2">
              Create your first organization to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {renderOrgTree(organizations)}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
          <ChartBarIcon className="h-8 w-8 text-gray-400 mb-2" />
          <h3 className="font-semibold text-gray-900">View Benchmarks</h3>
          <p className="text-sm text-gray-500 mt-1">
            Compare metrics across churches
          </p>
        </button>

        <button className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
          <Cog6ToothIcon className="h-8 w-8 text-gray-400 mb-2" />
          <h3 className="font-semibold text-gray-900">Manage Programs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create and share templates
          </p>
        </button>

        <button className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
          <UsersIcon className="h-8 w-8 text-gray-400 mb-2" />
          <h3 className="font-semibold text-gray-900">Manage Roles</h3>
          <p className="text-sm text-gray-500 mt-1">
            Assign organizational permissions
          </p>
        </button>
      </div>
    </div>
  )
}
