import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('page-header', className)}>
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, children, className }: SectionHeaderProps) {
  return (
    <div className={cn('section-header', className)}>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-secondary-500">{subtitle}</p>}
        </div>
        {children && (
          <div className="mt-4 sm:ml-4 sm:mt-0 sm:flex-none">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
