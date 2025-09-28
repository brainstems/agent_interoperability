'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Permission, UIRoleCategory } from '@/lib/role-permissions'
import { getHomeRouteForRole } from '@/lib/unified-navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: Permission[]
  allowedRoles?: UIRoleCategory[]
  requireAuth?: boolean
  redirectTo?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  allowedRoles = [],
  requireAuth = true,
  redirectTo,
  fallback
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, profile, loading, userRole, canAccess } = useAuth()

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600 font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    if (redirectTo) {
      router.push(redirectTo)
      return null
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 mx-auto mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Authentication Required</h1>
            <p className="text-secondary-600 mt-2">Please sign in to access this page</p>
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

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (redirectTo) {
      router.push(redirectTo)
      return null
    }

    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-600 mx-auto mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Access Restricted</h1>
            <p className="text-secondary-600 mt-2">
              Your role ({userRole}) does not have permission to access this page
            </p>
          </div>
          <button
            onClick={() => router.push(getHomeRouteForRole(userRole))}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Check permission-based access
  if (requiredPermissions.length > 0 && !canAccess(requiredPermissions)) {
    if (redirectTo) {
      router.push(redirectTo)
      return null
    }

    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600 mx-auto mb-4">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">Insufficient Permissions</h1>
            <p className="text-secondary-600 mt-2">
              You don't have the required permissions to access this feature
            </p>
          </div>
          <button
            onClick={() => router.push(getHomeRouteForRole(userRole))}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // All checks passed, render the protected content
  return <>{children}</>
}

// Higher-order component for protecting pages
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}
