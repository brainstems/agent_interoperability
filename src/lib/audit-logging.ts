/**
 * Audit Logging Service
 * Comprehensive audit logging for compliance and forensic analysis
 */

import { supabase } from './supabase'
import { NextRequest } from 'next/server'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT'
export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AuditLogEntry {
  churchId: string
  userId?: string
  apiClientId?: string
  sessionId?: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  resourceName?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  changedFields?: string[]
  severity?: AuditSeverity
  description?: string
  ipAddress?: string
  userAgent?: string
  requestMethod?: string
  requestPath?: string
  requestParams?: Record<string, any>
  metadata?: Record<string, any>
}

export interface SecurityEvent {
  churchId?: string
  userId?: string
  eventType: string
  severity: AuditSeverity
  description: string
  ipAddress?: string
  userAgent?: string
  additionalData?: Record<string, any>
}

export interface ApiUsageLog {
  churchId: string
  apiClientId?: string
  userId?: string
  method: string
  endpoint: string
  statusCode: number
  responseTimeMs?: number
  ipAddress?: string
  userAgent?: string
  requestSizeBytes?: number
  responseSizeBytes?: number
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async logEvent(entry: AuditLogEntry): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          church_id: entry.churchId,
          user_id: entry.userId,
          api_client_id: entry.apiClientId,
          session_id: entry.sessionId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          resource_name: entry.resourceName,
          old_values: entry.oldValues,
          new_values: entry.newValues,
          changed_fields: entry.changedFields,
          severity: entry.severity || 'LOW',
          description: entry.description,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          request_method: entry.requestMethod,
          request_path: entry.requestPath,
          request_params: entry.requestParams,
          metadata: entry.metadata || {}
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to log audit event:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Audit logging error:', error)
      return null
    }
  }

  /**
   * Log a security event
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          church_id: event.churchId,
          user_id: event.userId,
          event_type: event.eventType,
          severity: event.severity,
          description: event.description,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          additional_data: event.additionalData || {}
        })

      if (error) {
        console.error('Failed to log security event:', error)
      }
    } catch (error) {
      console.error('Security event logging error:', error)
    }
  }

  /**
   * Log API usage
   */
  static async logApiUsage(usage: ApiUsageLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_usage_logs')
        .insert({
          church_id: usage.churchId,
          api_client_id: usage.apiClientId,
          user_id: usage.userId,
          method: usage.method,
          endpoint: usage.endpoint,
          status_code: usage.statusCode,
          response_time_ms: usage.responseTimeMs,
          ip_address: usage.ipAddress,
          user_agent: usage.userAgent,
          request_size_bytes: usage.requestSizeBytes,
          response_size_bytes: usage.responseSizeBytes
        })

      if (error) {
        console.error('Failed to log API usage:', error)
      }
    } catch (error) {
      console.error('API usage logging error:', error)
    }
  }

  /**
   * Log detailed field changes
   */
  static async logFieldChanges(
    auditLogId: string,
    churchId: string,
    tableName: string,
    recordId: string,
    oldRecord: Record<string, any>,
    newRecord: Record<string, any>
  ): Promise<void> {
    try {
      const changes: any[] = []

      // Find changed fields
      const oldKeys = Object.keys(oldRecord)
      const newKeys = Object.keys(newRecord)
      const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))
      
      for (const key of allKeys) {
        const oldValue = oldRecord[key]
        const newValue = newRecord[key]
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            audit_log_id: auditLogId,
            church_id: churchId,
            table_name: tableName,
            record_id: recordId,
            field_name: key,
            old_value: typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
            new_value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
            old_value_json: typeof oldValue === 'object' ? oldValue : null,
            new_value_json: typeof newValue === 'object' ? newValue : null
          })
        }
      }

      if (changes.length > 0) {
        const { error } = await supabase
          .from('data_change_history')
          .insert(changes)

        if (error) {
          console.error('Failed to log field changes:', error)
        }
      }
    } catch (error) {
      console.error('Field change logging error:', error)
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(
    churchId: string,
    filters: {
      userId?: string
      resourceType?: string
      action?: AuditAction
      severity?: AuditSeverity
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    } = {}
  ) {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles(first_name, last_name, email),
          change_history:data_change_history(*)
        `)
        .eq('church_id', churchId)

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Failed to get audit logs:', error)
      throw error
    }
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(
    churchId: string,
    filters: {
      severity?: AuditSeverity
      eventType?: string
      isResolved?: boolean
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    } = {}
  ) {
    try {
      let query = supabase
        .from('security_events')
        .select(`
          *,
          user:profiles(first_name, last_name, email),
          resolved_by_user:profiles!security_events_resolved_by_fkey(first_name, last_name, email)
        `)
        .eq('church_id', churchId)

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType)
      }

      if (filters.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Failed to get security events:', error)
      throw error
    }
  }

  /**
   * Extract request context from NextRequest
   */
  static extractRequestContext(request: NextRequest) {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    return {
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestMethod: request.method,
      requestPath: request.nextUrl.pathname,
      requestParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    }
  }
}

/**
 * Audit middleware for automatic logging
 */
export function createAuditMiddleware() {
  return async (
    request: NextRequest,
    response: Response,
    context: {
      userId?: string
      churchId?: string
      action?: AuditAction
      resourceType?: string
      resourceId?: string
      resourceName?: string
      oldValues?: Record<string, any>
      newValues?: Record<string, any>
    }
  ) => {
    const requestContext = AuditLogger.extractRequestContext(request)
    const startTime = Date.now()

    try {
      // Log the audit event
      if (context.churchId && context.action && context.resourceType) {
        await AuditLogger.logEvent({
          churchId: context.churchId,
          userId: context.userId,
          action: context.action,
          resourceType: context.resourceType,
          resourceId: context.resourceId,
          resourceName: context.resourceName,
          oldValues: context.oldValues,
          newValues: context.newValues,
          severity: 'LOW',
          ...requestContext
        })
      }

      // Log API usage
      if (context.churchId) {
        const responseTime = Date.now() - startTime
        await AuditLogger.logApiUsage({
          churchId: context.churchId,
          userId: context.userId,
          method: request.method,
          endpoint: request.nextUrl.pathname,
          statusCode: response.status,
          responseTimeMs: responseTime,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent
        })
      }
    } catch (error) {
      console.error('Audit middleware error:', error)
    }
  }
}

/**
 * Helper functions for common audit scenarios
 */
export const AuditHelpers = {
  /**
   * Log member creation
   */
  async logMemberCreated(
    churchId: string,
    userId: string,
    memberId: string,
    memberData: Record<string, any>,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    return AuditLogger.logEvent({
      churchId,
      userId,
      action: 'CREATE',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: `${memberData.first_name} ${memberData.last_name}`,
      newValues: memberData,
      severity: 'LOW',
      description: 'New member created',
      ...context
    })
  },

  /**
   * Log member update
   */
  async logMemberUpdated(
    churchId: string,
    userId: string,
    memberId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    const auditId = await AuditLogger.logEvent({
      churchId,
      userId,
      action: 'UPDATE',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: `${newData.first_name} ${newData.last_name}`,
      oldValues: oldData,
      newValues: newData,
      severity: 'LOW',
      description: 'Member profile updated',
      ...context
    })

    // Log detailed field changes
    if (auditId) {
      await AuditLogger.logFieldChanges(
        auditId,
        churchId,
        'profiles',
        memberId,
        oldData,
        newData
      )
    }

    return auditId
  },

  /**
   * Log failed login attempt
   */
  async logFailedLogin(
    email: string,
    reason: string,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    return AuditLogger.logSecurityEvent({
      eventType: 'failed_login',
      severity: 'MEDIUM',
      description: `Failed login attempt for ${email}: ${reason}`,
      additionalData: { email, reason },
      ...context
    })
  },

  /**
   * Log successful login
   */
  async logSuccessfulLogin(
    churchId: string,
    userId: string,
    email: string,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    return AuditLogger.logEvent({
      churchId,
      userId,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: userId,
      resourceName: email,
      severity: 'LOW',
      description: 'User logged in successfully',
      ...context
    })
  },

  /**
   * Log permission denied
   */
  async logPermissionDenied(
    churchId: string,
    userId: string,
    resource: string,
    action: string,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    return AuditLogger.logSecurityEvent({
      churchId,
      userId,
      eventType: 'permission_denied',
      severity: 'HIGH',
      description: `Permission denied: ${action} on ${resource}`,
      additionalData: { resource, action },
      ...context
    })
  },

  /**
   * Log member data viewed
   */
  async logMemberViewed(
    churchId: string,
    userId: string,
    memberCount: number,
    searchCriteria: Record<string, any>,
    request?: NextRequest
  ) {
    const context = request ? AuditLogger.extractRequestContext(request) : {}
    
    return AuditLogger.logEvent({
      churchId,
      userId,
      action: 'VIEW',
      resourceType: 'member_list',
      severity: 'LOW',
      description: `Viewed ${memberCount} members`,
      metadata: { memberCount, searchCriteria },
      ...context
    })
  }
}

export default AuditLogger
