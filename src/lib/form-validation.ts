// Form validation utilities for Church CRM

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string
}

export function validateForm(data: any, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {}

  Object.keys(rules).forEach(field => {
    const value = data[field]
    const rule = rules[field]
    
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${formatFieldName(field)} is required`
      return
    }

    // Skip other validations if field is empty and not required
    if (!value) return

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${formatFieldName(field)} must be at least ${rule.minLength} characters`
      return
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${formatFieldName(field)} must not exceed ${rule.maxLength} characters`
      return
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = `${formatFieldName(field)} format is invalid`
      return
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        errors[field] = customError
        return
      }
    }
  })

  return errors
}

export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/.+/,
  zipCode: /^\d{5}(-\d{4})?$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
}

// Common validation rules
export const CommonRules = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: ValidationPatterns.email 
  },
  optionalEmail: { 
    pattern: ValidationPatterns.email 
  },
  phone: { 
    pattern: ValidationPatterns.phone 
  },
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 50 
  },
  shortText: { 
    maxLength: 100 
  },
  longText: { 
    maxLength: 1000 
  },
  url: { 
    pattern: ValidationPatterns.url 
  },
  positiveNumber: {
    custom: (value: any) => {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0) {
        return 'Must be a positive number'
      }
      return null
    }
  },
  futureDate: {
    custom: (value: any) => {
      const date = new Date(value)
      const now = new Date()
      if (date <= now) {
        return 'Date must be in the future'
      }
      return null
    }
  }
}

// Specific validation rule sets for different forms
export const MemberValidationRules: ValidationRules = {
  firstName: CommonRules.name,
  lastName: CommonRules.name,
  email: CommonRules.optionalEmail,
  phone: CommonRules.phone,
  memberStatus: CommonRules.required
}

export const EventValidationRules: ValidationRules = {
  title: { required: true, minLength: 3, maxLength: 100 },
  description: { maxLength: 500 },
  startDateTime: { required: true },
  endDateTime: { 
    required: true,
    custom: (value: any, formData?: any) => {
      if (formData?.startDateTime && new Date(value) <= new Date(formData.startDateTime)) {
        return 'End time must be after start time'
      }
      return null
    }
  },
  location: { required: true, maxLength: 200 },
  eventType: CommonRules.required,
  maxAttendees: {
    custom: (value: any) => {
      if (value && (isNaN(value) || parseInt(value) < 1)) {
        return 'Must be a positive number'
      }
      return null
    }
  }
}

export const GroupValidationRules: ValidationRules = {
  name: { required: true, minLength: 3, maxLength: 100 },
  description: { maxLength: 500 },
  groupType: CommonRules.required,
  maxCapacity: {
    custom: (value: any) => {
      if (value && (isNaN(value) || parseInt(value) < 1)) {
        return 'Must be a positive number'
      }
      return null
    }
  }
}

export const DonationValidationRules: ValidationRules = {
  memberId: CommonRules.required,
  amount: {
    required: true,
    custom: (value: any) => {
      const num = parseFloat(value)
      if (isNaN(num) || num <= 0) {
        return 'Amount must be greater than 0'
      }
      return null
    }
  },
  donationDate: CommonRules.required,
  paymentMethod: CommonRules.required,
  fundId: CommonRules.required
}

export const PastoralCareValidationRules: ValidationRules = {
  memberId: CommonRules.required,
  careType: CommonRules.required,
  reason: { required: true, minLength: 10, maxLength: 500 },
  visitDate: { required: true },
  notes: { maxLength: 1000 }
}

export const TaskValidationRules: ValidationRules = {
  title: { required: true, minLength: 3, maxLength: 100 },
  description: { maxLength: 500 },
  taskType: CommonRules.required,
  priority: CommonRules.required,
  assignedTo: CommonRules.required,
  dueDate: CommonRules.futureDate
}
