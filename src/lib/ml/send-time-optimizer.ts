/**
 * Send-Time Optimization
 * 
 * Learns optimal communication times for each member based on:
 * - Historical open/click patterns
 * - Device usage patterns
 * - Day-of-week preferences
 * - Time-of-day preferences
 */

import { createClient } from '@/lib/supabase'

interface EngagementEvent {
  timestamp: Date
  channel: 'email' | 'sms'
  action: 'sent' | 'opened' | 'clicked'
  device?: 'mobile' | 'desktop' | 'tablet'
}

interface SendTimeProfile {
  email_optimal_day: string[]
  email_optimal_hour: number
  sms_optimal_day: string[]
  sms_optimal_hour: number
  typical_open_time_email?: string
  typical_open_time_sms?: string
  avg_time_to_open_minutes: number
  primary_device: 'mobile' | 'desktop' | 'tablet'
  sample_size: number
  confidence_level: number
}

export class SendTimeOptimizer {
  private supabase = createClient()

  /**
   * Analyze engagement history and create send-time profile
   */
  async analyzeMemberEngagement(memberId: string): Promise<SendTimeProfile | null> {
    // Get engagement history from journey step executions
    const { data: executions } = await this.supabase
      .from('journey_step_executions')
      .select(`
        *,
        journey_enrollments!inner(member_id),
        journey_steps!inner(communication_channel)
      `)
      .eq('journey_enrollments.member_id', memberId)
      .in('status', ['opened', 'clicked'])
      .gte('executed_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // Last 180 days
      .order('executed_at', { ascending: false })
      .limit(100)

    if (!executions || executions.length < 10) {
      // Not enough data
      return null
    }

    // Parse engagement events
    const events: EngagementEvent[] = executions.map(exec => ({
      timestamp: new Date(exec.executed_at),
      channel: exec.journey_steps?.communication_channel === 'sms' ? 'sms' : 'email',
      action: exec.status as 'opened' | 'clicked',
      device: this.detectDevice(exec.response_data)
    }))

    // Analyze patterns
    const emailEvents = events.filter(e => e.channel === 'email')
    const smsEvents = events.filter(e => e.channel === 'sms')

    const profile: SendTimeProfile = {
      email_optimal_day: this.findOptimalDays(emailEvents),
      email_optimal_hour: this.findOptimalHour(emailEvents),
      sms_optimal_day: this.findOptimalDays(smsEvents),
      sms_optimal_hour: this.findOptimalHour(smsEvents),
      typical_open_time_email: this.findTypicalTime(emailEvents),
      typical_open_time_sms: this.findTypicalTime(smsEvents),
      avg_time_to_open_minutes: this.calculateAvgTimeToOpen(executions),
      primary_device: this.findPrimaryDevice(events),
      sample_size: events.length,
      confidence_level: this.calculateConfidence(events.length)
    }

    // Store profile in database
    await this.storeProfile(memberId, profile)

    return profile
  }

  /**
   * Find optimal days of week based on engagement
   */
  private findOptimalDays(events: EngagementEvent[]): string[] {
    if (events.length === 0) return ['tuesday', 'thursday']

    const dayMap: Record<string, number> = {}
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    events.forEach(event => {
      const day = days[event.timestamp.getDay()]
      dayMap[day] = (dayMap[day] || 0) + 1
    })

    // Return top 2 days
    const sortedDays = Object.entries(dayMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([day]) => day)

    return sortedDays.length > 0 ? sortedDays : ['tuesday', 'thursday']
  }

  /**
   * Find optimal hour of day
   */
  private findOptimalHour(events: EngagementEvent[]): number {
    if (events.length === 0) return 10 // Default 10 AM

    const hourMap: Record<number, number> = {}

    events.forEach(event => {
      const hour = event.timestamp.getHours()
      hourMap[hour] = (hourMap[hour] || 0) + 1
    })

    // Find hour with most engagement
    const sortedHours = Object.entries(hourMap)
      .sort(([, a], [, b]) => b - a)

    return sortedHours.length > 0 ? parseInt(sortedHours[0][0]) : 10
  }

  /**
   * Find typical time pattern (AM/PM preference)
   */
  private findTypicalTime(events: EngagementEvent[]): string | undefined {
    if (events.length === 0) return undefined

    const hourCounts = events.reduce((acc, event) => {
      const hour = event.timestamp.getHours()
      if (hour < 12) {
        acc.morning++
      } else if (hour < 17) {
        acc.afternoon++
      } else {
        acc.evening++
      }
      return acc
    }, { morning: 0, afternoon: 0, evening: 0 })

    const max = Math.max(hourCounts.morning, hourCounts.afternoon, hourCounts.evening)
    
    if (max === hourCounts.morning) return '09:00:00'
    if (max === hourCounts.afternoon) return '14:00:00'
    return '18:00:00'
  }

  /**
   * Calculate average time to open (in minutes)
   */
  private calculateAvgTimeToOpen(executions: any[]): number {
    // This would require comparing sent_at vs opened_at timestamps
    // For now, return a default
    return 30
  }

  /**
   * Detect device from response data
   */
  private detectDevice(responseData: any): 'mobile' | 'desktop' | 'tablet' {
    // This would parse user agent from response_data
    // For now, default to mobile (most common)
    if (!responseData) return 'mobile'
    
    const userAgent = responseData.user_agent?.toLowerCase() || ''
    if (userAgent.includes('mobile') || userAgent.includes('iphone') || userAgent.includes('android')) {
      return 'mobile'
    }
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet'
    }
    return 'desktop'
  }

  /**
   * Find primary device used
   */
  private findPrimaryDevice(events: EngagementEvent[]): 'mobile' | 'desktop' | 'tablet' {
    const deviceCounts = events.reduce((acc, event) => {
      if (event.device) {
        acc[event.device] = (acc[event.device] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const sorted = Object.entries(deviceCounts).sort(([, a], [, b]) => b - a)
    return (sorted[0]?.[0] as 'mobile' | 'desktop' | 'tablet') || 'mobile'
  }

  /**
   * Calculate confidence level based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Simple heuristic: more samples = higher confidence
    if (sampleSize >= 50) return 0.95
    if (sampleSize >= 30) return 0.85
    if (sampleSize >= 20) return 0.75
    if (sampleSize >= 10) return 0.65
    return 0.50
  }

  /**
   * Store send-time profile in database
   */
  private async storeProfile(memberId: string, profile: SendTimeProfile) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90) // Profile valid for 90 days

    await this.supabase.from('send_time_profiles').upsert({
      member_id: memberId,
      church_id: (await this.getMemberChurchId(memberId)),
      email_optimal_day: profile.email_optimal_day,
      email_optimal_hour: profile.email_optimal_hour,
      sms_optimal_day: profile.sms_optimal_day,
      sms_optimal_hour: profile.sms_optimal_hour,
      typical_open_time_email: profile.typical_open_time_email,
      typical_open_time_sms: profile.typical_open_time_sms,
      avg_time_to_open_minutes: profile.avg_time_to_open_minutes,
      primary_device: profile.primary_device,
      sample_size: profile.sample_size,
      confidence_level: profile.confidence_level,
      last_engagement_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true
    }, {
      onConflict: 'member_id'
    })
  }

  /**
   * Get optimal send time for a member
   */
  async getOptimalSendTime(
    memberId: string,
    channel: 'email' | 'sms' = 'email',
    preferredDate?: Date
  ): Promise<Date> {
    // Check for existing profile
    const { data: profile } = await this.supabase
      .from('send_time_profiles')
      .select('*')
      .eq('member_id', memberId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    const now = preferredDate || new Date()
    const optimalTime = new Date(now)

    if (profile) {
      // Use learned preferences
      const optimalDays = channel === 'email' ? profile.email_optimal_day : profile.sms_optimal_day
      const optimalHour = channel === 'email' ? profile.email_optimal_hour : profile.sms_optimal_hour

      // Set to optimal hour
      optimalTime.setHours(optimalHour, 0, 0, 0)

      // Find next optimal day
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][optimalTime.getDay()]
      
      if (!optimalDays.includes(currentDay)) {
        // Advance to next optimal day
        for (let i = 1; i <= 7; i++) {
          optimalTime.setDate(optimalTime.getDate() + 1)
          const nextDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][optimalTime.getDay()]
          if (optimalDays.includes(nextDay)) {
            break
          }
        }
      }
    } else {
      // Use defaults
      const defaultHours = { email: 10, sms: 14 }
      optimalTime.setHours(defaultHours[channel], 0, 0, 0)

      // Default to next Tuesday or Thursday
      while (optimalTime.getDay() !== 2 && optimalTime.getDay() !== 4) {
        optimalTime.setDate(optimalTime.getDate() + 1)
      }
    }

    // Ensure it's in the future
    if (optimalTime < now) {
      optimalTime.setDate(optimalTime.getDate() + 1)
    }

    // Avoid weekends for email
    if (channel === 'email') {
      while (optimalTime.getDay() === 0 || optimalTime.getDay() === 6) {
        optimalTime.setDate(optimalTime.getDate() + 1)
      }
    }

    return optimalTime
  }

  /**
   * Batch analyze engagement for all active members
   */
  async batchAnalyzeEngagement(churchId: string) {
    const { data: members } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)

    if (!members) return []

    const results = []
    for (const member of members) {
      try {
        const profile = await this.analyzeMemberEngagement(member.id)
        results.push({ memberId: member.id, profile, success: true })
      } catch (error) {
        results.push({ memberId: member.id, error, success: false })
      }
    }

    return results
  }

  /**
   * Helper to get member's church ID
   */
  private async getMemberChurchId(memberId: string): Promise<string> {
    const { data } = await this.supabase
      .from('profiles')
      .select('church_id')
      .eq('id', memberId)
      .single()

    return data?.church_id || ''
  }

  /**
   * Track engagement event (for future learning)
   */
  async trackEngagement(
    memberId: string,
    channel: 'email' | 'sms',
    action: 'sent' | 'opened' | 'clicked',
    metadata?: Record<string, any>
  ) {
    // This would be called from journey execution or communication tracking
    // Store in a table for future analysis
    console.log(`Tracking ${action} for ${memberId} via ${channel}`, metadata)
    
    // In production, store this data for continuous learning
    // Could use a time-series database or append to journey_step_executions
  }
}

export const sendTimeOptimizer = new SendTimeOptimizer()
