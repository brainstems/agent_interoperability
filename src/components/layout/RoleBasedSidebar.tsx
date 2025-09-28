'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleColor } from '@/lib/utils'
import { 
  UNIFIED_NAVIGATION, 
  getFilteredNavigation, 
  getIconComponent,
  NavigationItem 
} from '@/lib/unified-navigation'
import { mapDatabaseRoleToUI } from '@/lib/role-permissions'

interface RoleBasedSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function RoleBasedSidebar({ sidebarOpen, setSidebarOpen }: RoleBasedSidebarProps) {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  
  // Map database role to UI role category
  const userRole = profile?.role ? mapDatabaseRoleToUI(profile.role) : 'lay'
  
  // Get filtered navigation based on user role and permissions
  const navigation = getFilteredNavigation(userRole, profile)

  const roleColorClass = getRoleColor(userRole)

  const handleNavClick = (item: NavigationItem) => {
    if (item.external && item.externalUrl) {
      // Open external URLs in new tab
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    }
    // Internal navigation handled by Link component
  }

  const renderNavigationItem = (item: NavigationItem) => {
    const IconComponent = getIconComponent(item.icon)
    const isActive = pathname === item.path
    const isExternal = item.external

    if (isExternal) {
      return (
        <button
          key={item.id}
          onClick={() => handleNavClick(item)}
          className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'} w-full text-left flex items-center`}
          title={item.description}
        >
          <IconComponent
            className={`nav-icon ${isActive ? 'nav-icon-active' : 'nav-icon-inactive'}`}
            aria-hidden="true"
          />
          <span className="flex-1">{item.label}</span>
          <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.path}
        className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
        title={item.description}
      >
        <IconComponent
          className={`nav-icon ${isActive ? 'nav-icon-active' : 'nav-icon-inactive'}`}
          aria-hidden="true"
        />
        {item.label}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-secondary-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
              <div className="flex h-16 shrink-0 items-center">
                <div className="flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleColorClass}`}>
                    <span className="text-sm font-semibold text-white">CM</span>
                  </div>
                  <span className="ml-3 text-lg font-semibold text-secondary-900">ChurchManager</span>
                </div>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  {navigation.map((section) => {
                    if (section.items.length === 0) return null

                    return (
                      <li key={section.id}>
                        <div className="text-xs font-semibold leading-6 text-secondary-400 uppercase tracking-wide mb-2">
                          {section.label}
                        </div>
                        <ul role="list" className="-mx-2 space-y-1">
                          {section.items.map((item) => (
                            <li key={item.id}>
                              {renderNavigationItem(item)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                  <li className="-mx-6 mt-auto">
                    <div className={`flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-secondary-900 ${roleColorClass}`}>
                      <div className="h-8 w-8 rounded-full bg-secondary-50 flex items-center justify-center">
                        <span className="text-xs font-medium text-secondary-600">
                          {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </span>
                      </div>
                      <span className="sr-only">Your profile</span>
                      <div className="flex flex-col">
                        <span aria-hidden="true">{profile?.first_name} {profile?.last_name}</span>
                        <span className="text-xs text-secondary-500 capitalize">{userRole}</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-secondary-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleColorClass}`}>
                <span className="text-sm font-semibold text-white">CM</span>
              </div>
              <span className="ml-3 text-lg font-semibold text-secondary-900">ChurchManager</span>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              {navigation.map((section) => {
                if (section.items.length === 0) return null

                return (
                  <li key={section.id}>
                    <div className="text-xs font-semibold leading-6 text-secondary-400 uppercase tracking-wide mb-2">
                      {section.label}
                    </div>
                    <ul role="list" className="-mx-2 space-y-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          {renderNavigationItem(item)}
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
              <li className="mt-auto">
                <div className={`flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-secondary-900 ${roleColorClass}`}>
                  <div className="h-8 w-8 rounded-full bg-secondary-50 flex items-center justify-center">
                    <span className="text-xs font-medium text-secondary-600">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </span>
                  </div>
                  <span className="sr-only">Your profile</span>
                  <div className="flex flex-col">
                    <span aria-hidden="true">{profile?.first_name} {profile?.last_name}</span>
                    <span className="text-xs text-secondary-500 capitalize">{userRole}</span>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
