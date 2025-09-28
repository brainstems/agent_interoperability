'use client'

import React, { useState } from 'react'
import RoleBasedSidebar from './RoleBasedSidebar'
import Header from './Header'
import UnifiedBreadcrumb from './UnifiedBreadcrumb'
import RoleBasedHome from './RoleBasedHome'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <RoleBasedHome>
      <div className="page-container">
        <RoleBasedSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <div className="lg:pl-72">
          <Header setSidebarOpen={setSidebarOpen} />
          
          <main className="main-content">
            <div className="px-4 sm:px-6 lg:px-8">
              <UnifiedBreadcrumb />
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleBasedHome>
  )
}
