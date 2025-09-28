'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getHomeRouteForRole } from '@/lib/unified-navigation'
import { mapDatabaseRoleToUI } from '@/lib/role-permissions'

interface RoleBasedHomeProps {
  children?: React.ReactNode
}

export default function RoleBasedHome({ children }: RoleBasedHomeProps) {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && user && profile) {
      // Map database role to UI role category
      const userRole = mapDatabaseRoleToUI(profile.role)
      
      // Get the appropriate home route for this role
      const homeRoute = getHomeRouteForRole(userRole)
      
      // Only redirect if we're on the root path
      if (window.location.pathname === '/') {
        router.push(homeRoute)
      }
    }
  }, [user, profile, loading, router])

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600 mx-auto mb-4">
              <span className="text-lg font-semibold text-white">CM</span>
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">ChurchManager</h1>
            <p className="text-secondary-600 mt-2">Please sign in to access your dashboard</p>
          </div>
          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
