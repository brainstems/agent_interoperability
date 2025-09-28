import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'role-admin'
    case 'clergy':
      return 'role-clergy'
    case 'volunteer':
      return 'role-volunteer'
    case 'member':
      return 'role-member'
    default:
      return 'role-member'
  }
}

export function getMemberStatusBadge(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'badge badge-success'
    case 'inactive':
      return 'badge badge-secondary'
    case 'visitor':
      return 'badge badge-warning'
    case 'pending':
      return 'badge badge-primary'
    default:
      return 'badge badge-secondary'
  }
}
