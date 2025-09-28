'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

type Tables = Database['public']['Tables']

// Generic hook for Supabase queries with real-time subscriptions
export function useSupabaseQuery<T extends keyof Tables>(
  table: T,
  options?: {
    select?: string
    filter?: Record<string, any>
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    single?: boolean
    realtime?: boolean
  }
) {
  const [data, setData] = useState<Tables[T]['Row'][] | Tables[T]['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile?.church_id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from(table)
          .select(options?.select || '*')

        // Apply filters
        if (options?.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }

        // Apply church filter by default
        query = query.eq('church_id', profile.church_id)

        // Apply ordering
        if (options?.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending ?? true 
          })
        }

        // Apply limit
        if (options?.limit) {
          query = query.limit(options.limit)
        }

        const { data: result, error: queryError } = options?.single 
          ? await query.single()
          : await query

        if (queryError) {
          setError(queryError.message)
          return
        }

        setData(result as unknown as Tables[T]['Row'][] | Tables[T]['Row'] | null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up real-time subscription if enabled
    if (options?.realtime !== false) {
      const subscription = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: table,
            filter: `church_id=eq.${profile.church_id}`
          },
          (payload) => {
            console.log(`Real-time update for ${table}:`, payload)
            fetchData() // Refetch data on changes
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [table, profile?.church_id, JSON.stringify(options)])

  return { data, loading, error, refetch: () => setLoading(true) }
}

// Hook for member profiles with enhanced features
export function useMembers(filters?: {
  memberStatus?: Database['public']['Enums']['member_status']
  role?: Database['public']['Enums']['user_role']
  isActive?: boolean
}) {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Tables['profiles']['Row'][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.church_id) return

    const fetchMembers = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('profiles')
          .select('*')
          .eq('church_id', profile.church_id)

        if (filters?.memberStatus) {
          query = query.eq('member_status', filters.memberStatus)
        }
        if (filters?.role) {
          query = query.eq('role', filters.role)
        }
        if (filters?.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive)
        }

        query = query.order('last_name', { ascending: true })

        const { data, error: queryError } = await query

        if (queryError) {
          setError(queryError.message)
          return
        }

        setMembers(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()

    // Real-time subscription for member updates
    const subscription = supabase
      .channel('members_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `church_id=eq.${profile.church_id}`
        },
        () => {
          fetchMembers()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [profile?.church_id, JSON.stringify(filters)])

  return { members, loading, error }
}

// Hook for connections (fellowship feature)
export function useConnections(userId?: string) {
  const { user, profile } = useAuth()
  const targetUserId = userId || user?.id
  
  return useSupabaseQuery('connections', {
    filter: targetUserId ? { user_id: targetUserId } : undefined,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  })
}

// Hook for events
export function useEvents(options?: {
  upcoming?: boolean
  eventType?: Database['public']['Enums']['event_type']
  limit?: number
}) {
  const baseFilter: Record<string, any> = {}
  
  if (options?.eventType) {
    baseFilter.event_type = options.eventType
  }

  let query = useSupabaseQuery('events', {
    filter: baseFilter,
    orderBy: { column: 'start_datetime', ascending: true },
    limit: options?.limit,
    realtime: true
  })

  // Filter upcoming events on the client side if needed
  if (options?.upcoming && query.data) {
    const now = new Date().toISOString()
    const upcomingEvents = Array.isArray(query.data) 
      ? query.data.filter(event => event.start_datetime > now)
      : query.data.start_datetime > now ? query.data : null

    return {
      ...query,
      data: upcomingEvents
    }
  }

  return query
}

// Hook for notifications
export function useNotifications() {
  const { user } = useAuth()
  
  return useSupabaseQuery('notifications', {
    filter: user ? { user_id: user.id } : undefined,
    orderBy: { column: 'created_at', ascending: false },
    limit: 50,
    realtime: true
  })
}

// Hook for agent tasks (admin only)
export function useAgentTasks() {
  const { profile } = useAuth()
  
  if (!profile || !['ADMIN', 'CLERGY'].includes(profile.role)) {
    return { data: null, loading: false, error: 'Unauthorized' }
  }

  return useSupabaseQuery('agent_tasks', {
    orderBy: { column: 'created_at', ascending: false },
    limit: 100,
    realtime: true
  })
}
