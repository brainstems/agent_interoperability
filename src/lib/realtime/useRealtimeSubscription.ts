/**
 * Real-time Subscription Hook
 * Manages Supabase Realtime subscriptions for live updates
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeSubscriptionOptions {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  onChange?: (payload: any) => void
}

export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions) {
  const {
    table,
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    try {
      // Create channel
      const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`
      const realtimeChannel = supabase.channel(channelName)

      // Set up event handlers
      const handlePayload = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        // Call specific handlers
        if (eventType === 'INSERT' && onInsert) {
          onInsert({ ...payload, record: newRecord })
        } else if (eventType === 'UPDATE' && onUpdate) {
          onUpdate({ ...payload, record: newRecord, old: oldRecord })
        } else if (eventType === 'DELETE' && onDelete) {
          onDelete({ ...payload, record: oldRecord })
        }

        // Call general change handler
        if (onChange) {
          onChange({ eventType, record: newRecord || oldRecord, old: oldRecord })
        }
      }

      // Subscribe to table changes
      let subscription = realtimeChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        handlePayload
      )

      // Subscribe
      subscription.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          console.log(`✅ Subscribed to ${channelName}`)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          console.log(`❌ Subscription closed: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          setError(new Error(`Channel error: ${channelName}`))
          console.error(`❌ Channel error: ${channelName}`)
        }
      })

      setChannel(realtimeChannel)
    } catch (err) {
      setError(err as Error)
      console.error('Subscription error:', err)
    }
  }, [table, filter, event, onInsert, onUpdate, onDelete, onChange])

  const unsubscribe = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel)
      setChannel(null)
      setIsConnected(false)
      console.log(`🔌 Unsubscribed from ${table}`)
    }
  }, [channel, table])

  // Subscribe on mount
  useEffect(() => {
    subscribe()
    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return {
    isConnected,
    error,
    unsubscribe,
    resubscribe: subscribe
  }
}

// Specialized hooks for common use cases

export function useCampaignProgress(campaignId: string, onUpdate: (data: any) => void) {
  return useRealtimeSubscription({
    table: 'campaigns',
    filter: `id=eq.${campaignId}`,
    event: 'UPDATE',
    onUpdate: (payload) => {
      const { amount_raised, goal_amount, actual_participants } = payload.record
      onUpdate({
        amount_raised,
        goal_amount,
        actual_participants,
        progress_percentage: goal_amount > 0 ? (amount_raised / goal_amount) * 100 : 0
      })
    }
  })
}

export function useGoalProgress(goalId: string, onUpdate: (data: any) => void) {
  return useRealtimeSubscription({
    table: 'vision_goals',
    filter: `id=eq.${goalId}`,
    event: 'UPDATE',
    onUpdate: (payload) => {
      const { current_value, target_numeric, unit } = payload.record
      onUpdate({
        current_value,
        target_numeric,
        unit,
        progress_percentage: target_numeric > 0 ? (current_value / target_numeric) * 100 : 0
      })
    }
  })
}

export function useNewDonations(churchId: string, onInsert: (donation: any) => void) {
  return useRealtimeSubscription({
    table: 'donations',
    filter: `church_id=eq.${churchId}`,
    event: 'INSERT',
    onInsert: (payload) => {
      onInsert(payload.record)
    }
  })
}

export function useMilestoneAchievements(campaignId: string, onInsert: (milestone: any) => void) {
  return useRealtimeSubscription({
    table: 'campaign_milestones',
    filter: `campaign_id=eq.${campaignId}`,
    event: 'INSERT',
    onInsert: (payload) => {
      if (payload.record.achieved_at) {
        onInsert(payload.record)
      }
    }
  })
}

export function useNewStories(visionId: string, onInsert: (story: any) => void) {
  return useRealtimeSubscription({
    table: 'stories',
    filter: `vision_id=eq.${visionId}`,
    event: 'INSERT',
    onInsert: (payload) => {
      if (payload.record.status === 'PUBLISHED') {
        onInsert(payload.record)
      }
    }
  })
}
