'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { UNIFIED_NAVIGATION, NavigationItem } from '@/lib/unified-navigation'

interface BreadcrumbItem {
  label: string
  href?: string
  external?: boolean
  current: boolean
}

export default function UnifiedBreadcrumb() {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard', current: false }
    ]

    // Find the current navigation item across all sections
    let currentItem: NavigationItem | null = null
    let currentSection: any = null

    for (const section of UNIFIED_NAVIGATION) {
      for (const item of section.items) {
        if (item.path === pathname || (item.external && pathname.includes(item.id))) {
          currentItem = item
          currentSection = section
          break
        }
      }
      if (currentItem) break
    }

    if (currentItem && currentSection) {
      // Add section breadcrumb
      breadcrumbs.push({
        label: currentSection.label,
        current: false
      })

      // Add current page breadcrumb
      breadcrumbs.push({
        label: currentItem.label,
        href: currentItem.external ? undefined : currentItem.path,
        external: currentItem.external,
        current: true
      })
    } else {
      // Fallback: try to generate breadcrumbs from pathname
      const pathSegments = pathname.split('/').filter(Boolean)
      
      if (pathSegments.length > 0) {
        // Convert path segments to readable labels
        const lastSegment = pathSegments[pathSegments.length - 1]
        const label = lastSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        breadcrumbs.push({
          label,
          href: pathname,
          current: true
        })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null // Don't show breadcrumbs for home page only
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon
                className="h-4 w-4 text-secondary-400 mx-2"
                aria-hidden="true"
              />
            )}
            
            {index === 0 ? (
              <Link
                href={item.href || '/dashboard'}
                className="text-secondary-500 hover:text-secondary-700 flex items-center"
              >
                <HomeIcon className="h-4 w-4 mr-1" />
                <span className="sr-only">{item.label}</span>
              </Link>
            ) : item.current ? (
              <span className="text-secondary-900 font-medium" aria-current="page">
                {item.label}
                {item.external && (
                  <svg className="inline h-3 w-3 ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-secondary-500 hover:text-secondary-700 font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-secondary-500 font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
