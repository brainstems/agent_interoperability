import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient>

export interface EventTrigger {
  id: string
  name: string
  description: string
  condition: (data: any) => Promise<boolean>
  agentName: string
  priority: 'low' | 'medium' | 'high'
  cooldownHours?: number // Prevent duplicate triggers
}

export interface MonitoringResult {
  triggered: boolean
  agentName?: string
  memberId?: string
  metadata?: Record<string, any>
  priority?: 'low' | 'medium' | 'high'
}

export class ChurchEventMonitor {
  private supabase: SupabaseClient
  private triggers: EventTrigger[] = []
  private lastTriggerTimes: Map<string, Date> = new Map()

  constructor() {
    this.supabase = createClient()
    this.initializeTriggers()
  }

  private initializeTriggers() {
    this.triggers = [
      // Member Retention & Engagement Triggers
      {
        id: 'inactivity_4_weeks',
        name: 'Member Inactivity Alert',
        description: 'Member hasn\'t attended worship/service in 4+ weeks',
        condition: async (data) => await this.checkMemberInactivity(data.memberId, 28),
        agentName: 'inactivity_alert_agent',
        priority: 'high',
        cooldownHours: 168 // 1 week
      },
      {
        id: 'milestone_celebration',
        name: 'Milestone Celebration',
        description: 'Baptism, anniversary, or birthday recorded',
        condition: async (data) => await this.checkMilestoneEvents(data),
        agentName: 'milestone_celebration_agent',
        priority: 'medium',
        cooldownHours: 24
      },
      {
        id: 'volunteer_dropout',
        name: 'Volunteer Drop-off Detection',
        description: 'Volunteer misses 2+ scheduled roles',
        condition: async (data) => await this.checkVolunteerDropoff(data.memberId, 2),
        agentName: 'volunteer_dropout_detector',
        priority: 'high',
        cooldownHours: 72
      },
      {
        id: 'newcomer_visit',
        name: 'Newcomer Onboarding',
        description: 'New visitor attends or fills out form',
        condition: async (data) => await this.checkNewcomerActivity(data),
        agentName: 'newcomer_onboarding_agent',
        priority: 'high',
        cooldownHours: 24
      },
      {
        id: 'at_risk_member',
        name: 'At-Risk Member Identification',
        description: 'Sharp drop in participation or giving',
        condition: async (data) => await this.checkAtRiskPatterns(data.memberId),
        agentName: 'at_risk_member_identifier',
        priority: 'high',
        cooldownHours: 168
      },
      {
        id: 'life_event_trigger',
        name: 'Life Event Tracking',
        description: 'Death, marriage, birth, crisis flagged',
        condition: async (data) => await this.checkLifeEvents(data),
        agentName: 'life_event_tracker_agent',
        priority: 'high',
        cooldownHours: 1
      },

      // Donation & Stewardship Triggers
      {
        id: 'lapsed_donor_3_months',
        name: 'Lapsed Donor Alert',
        description: 'No gift for 3+ months',
        condition: async (data) => await this.checkLapsedDonor(data.memberId, 90),
        agentName: 'lapsed_donor_reengagement_agent',
        priority: 'medium',
        cooldownHours: 720 // 30 days
      },
      {
        id: 'first_time_donation',
        name: 'First-Time Donor Journey',
        description: 'First donation made',
        condition: async (data) => await this.checkFirstTimeDonor(data),
        agentName: 'first_time_donor_journey_agent',
        priority: 'high',
        cooldownHours: 1
      },
      {
        id: 'major_gift_risk',
        name: 'Major Gift Risk Alert',
        description: 'Recurring donor skips expected month',
        condition: async (data) => await this.checkMajorGiftRisk(data.memberId),
        agentName: 'major_gift_risk_alert_agent',
        priority: 'high',
        cooldownHours: 168
      },
      {
        id: 'giving_season_approach',
        name: 'Giving Season Optimization',
        description: 'Approaching major season (e.g. Advent)',
        condition: async (data) => await this.checkGivingSeason(data.season),
        agentName: 'giving_season_optimizer_agent',
        priority: 'medium',
        cooldownHours: 2160 // 90 days
      },

      // Worship & Attendance Triggers
      {
        id: 'recurring_worship_absence',
        name: 'Recurring Worship Absence',
        description: 'Misses 3+ Sunday worship services',
        condition: async (data) => await this.checkWorshipAbsence(data.memberId, 3),
        agentName: 'recurring_absence_monitor_agent',
        priority: 'medium',
        cooldownHours: 168
      },
      {
        id: 'seasonal_attendance_drop',
        name: 'Seasonal Attendance Pattern',
        description: 'Attendance drop during summer/holidays',
        condition: async (data) => await this.checkSeasonalDrop(data.churchId),
        agentName: 'seasonal_attendance_pattern_agent',
        priority: 'low',
        cooldownHours: 168
      },

      // Communications & Digital Engagement Triggers
      {
        id: 'email_engagement_drop',
        name: 'Email Drop-Off Detection',
        description: 'Member stops opening weekly emails',
        condition: async (data) => await this.checkEmailEngagement(data.memberId, 4),
        agentName: 'email_dropoff_detector_agent',
        priority: 'low',
        cooldownHours: 168
      },
      {
        id: 'high_content_interest',
        name: 'High-Interest Content Tracking',
        description: 'Member clicks similar content repeatedly',
        condition: async (data) => await this.checkContentInterest(data.memberId, data.contentType),
        agentName: 'high_interest_click_tracker_agent',
        priority: 'low',
        cooldownHours: 72
      }
    ]
  }

  // Member Activity Monitoring Methods
  private async checkMemberInactivity(memberId: string, days: number): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: attendance } = await this.supabase
      .from('event_attendance')
      .select('check_in_time')
      .eq('member_id', memberId)
      .gte('check_in_time', cutoffDate.toISOString())
      .limit(1)

    return !attendance || attendance.length === 0
  }

  private async checkMilestoneEvents(data: any): Promise<boolean> {
    const today = new Date()
    const { memberId, eventType } = data

    if (eventType === 'birthday') {
      const { data: member } = await this.supabase
        .from('members')
        .select('birth_date')
        .eq('id', memberId)
        .single()

      if (member?.birth_date) {
        const birthDate = new Date(member.birth_date)
        return birthDate.getMonth() === today.getMonth() && 
               birthDate.getDate() === today.getDate()
      }
    }

    // Check for other milestone events in member notes or custom fields
    const { data: notes } = await this.supabase
      .from('member_notes')
      .select('note_text, created_at')
      .eq('member_id', memberId)
      .ilike('note_text', `%${eventType}%`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return Boolean(notes && notes.length > 0)
  }

  private async checkVolunteerDropoff(memberId: string, missedCount: number): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 14) // Last 2 weeks

    const { data: assignments } = await this.supabase
      .from('volunteer_assignments')
      .select(`
        id,
        schedule_slots!inner(date_time, status)
      `)
      .eq('member_id', memberId)
      .eq('status', 'active')
      .gte('schedule_slots.date_time', cutoffDate.toISOString())

    if (!assignments) return false

    const missedSlots = assignments.filter((assignment: any) => 
      assignment.schedule_slots.some((slot: any) => slot.status === 'no_show')
    )

    return missedSlots.length >= missedCount
  }

  private async checkNewcomerActivity(data: any): Promise<boolean> {
    const { memberId, activityType } = data
    
    if (activityType === 'first_visit') {
      const { data: member } = await this.supabase
        .from('members')
        .select('created_at, member_status')
        .eq('id', memberId)
        .single()

      if (member) {
        const createdDate = new Date(member.created_at)
        const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceCreated <= 7 && member.member_status === 'visitor'
      }
    }

    return false
  }

  private async checkAtRiskPatterns(memberId: string): Promise<boolean> {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    // Check attendance decline
    const { data: recentAttendance } = await this.supabase
      .from('event_attendance')
      .select('check_in_time')
      .eq('member_id', memberId)
      .gte('check_in_time', threeMonthsAgo.toISOString())

    const { data: previousAttendance } = await this.supabase
      .from('event_attendance')
      .select('check_in_time')
      .eq('member_id', memberId)
      .lt('check_in_time', threeMonthsAgo.toISOString())
      .gte('check_in_time', new Date(threeMonthsAgo.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const recentCount = recentAttendance?.length || 0
    const previousCount = previousAttendance?.length || 0

    // Check giving decline
    const { data: recentGiving } = await this.supabase
      .from('donations')
      .select('amount')
      .eq('member_id', memberId)
      .gte('donation_date', threeMonthsAgo.toISOString())

    const { data: previousGiving } = await this.supabase
      .from('donations')
      .select('amount')
      .eq('member_id', memberId)
      .lt('donation_date', threeMonthsAgo.toISOString())
      .gte('donation_date', new Date(threeMonthsAgo.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const recentGivingTotal = recentGiving?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0
    const previousGivingTotal = previousGiving?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0

    // Significant decline in either attendance or giving
    const attendanceDecline = previousCount > 0 && (recentCount / previousCount) < 0.5
    const givingDecline = previousGivingTotal > 0 && (recentGivingTotal / previousGivingTotal) < 0.5

    return attendanceDecline || givingDecline
  }

  private async checkLifeEvents(data: any): Promise<boolean> {
    const { memberId, eventType, severity } = data
    
    const lifeEventKeywords = [
      'death', 'funeral', 'passed away', 'died',
      'marriage', 'wedding', 'married',
      'birth', 'baby', 'newborn',
      'crisis', 'emergency', 'hospital', 'surgery',
      'job loss', 'unemployment', 'laid off',
      'divorce', 'separation'
    ]

    // Check recent notes for life event keywords
    const { data: notes } = await this.supabase
      .from('member_notes')
      .select('note_text, created_at')
      .eq('member_id', memberId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (notes) {
      return notes.some((note: any) => 
        lifeEventKeywords.some(keyword => 
          note.note_text.toLowerCase().includes(keyword)
        )
      )
    }

    return false
  }

  // Donation Monitoring Methods
  private async checkLapsedDonor(memberId: string, days: number): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: donations } = await this.supabase
      .from('donations')
      .select('donation_date')
      .eq('member_id', memberId)
      .gte('donation_date', cutoffDate.toISOString())
      .limit(1)

    // Check if they were a regular donor before
    const { data: previousDonations } = await this.supabase
      .from('donations')
      .select('donation_date')
      .eq('member_id', memberId)
      .lt('donation_date', cutoffDate.toISOString())
      .limit(3)

    return Boolean((!donations || donations.length === 0) && 
           (previousDonations && previousDonations.length >= 2))
  }

  private async checkFirstTimeDonor(data: any): Promise<boolean> {
    const { memberId } = data

    const { data: donations } = await this.supabase
      .from('donations')
      .select('id')
      .eq('member_id', memberId)
      .order('donation_date', { ascending: true })

    return Boolean(donations && donations.length === 1)
  }

  private async checkMajorGiftRisk(memberId: string): Promise<boolean> {
    // Check if member typically gives monthly and has missed this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    const { data: thisMonthGiving } = await this.supabase
      .from('donations')
      .select('amount')
      .eq('member_id', memberId)
      .gte('donation_date', thisMonth.toISOString())

    if (thisMonthGiving && thisMonthGiving.length > 0) return false

    // Check if they're typically a monthly donor with significant amounts
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: recentHistory } = await this.supabase
      .from('donations')
      .select('amount, donation_date')
      .eq('member_id', memberId)
      .gte('donation_date', sixMonthsAgo.toISOString())

    if (!recentHistory || recentHistory.length < 3) return false

    const averageGift = recentHistory.reduce((sum: number, d: any) => sum + d.amount, 0) / recentHistory.length
    return averageGift >= 500 // Major gift threshold
  }

  private checkGivingSeason(season: string): boolean {
    const now = new Date()
    const month = now.getMonth() + 1

    switch (season) {
      case 'advent':
        return month === 11 || month === 12
      case 'lent':
        return month === 2 || month === 3
      case 'year_end':
        return month === 11 || month === 12
      default:
        return false
    }
  }

  // Attendance Monitoring Methods
  private async checkWorshipAbsence(memberId: string, missedSundays: number): Promise<boolean> {
    const sundays = []
    const today = new Date()
    
    // Get last N Sundays
    for (let i = 0; i < missedSundays + 2; i++) {
      const sunday = new Date(today)
      sunday.setDate(today.getDate() - (today.getDay() + 7 * i))
      sundays.push(sunday)
    }

    let missedCount = 0
    for (const sunday of sundays.slice(0, missedSundays)) {
      const { data: attendance } = await this.supabase
        .from('event_attendance')
        .select('id')
        .eq('member_id', memberId)
        .gte('check_in_time', sunday.toISOString())
        .lt('check_in_time', new Date(sunday.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (!attendance || attendance.length === 0) {
        missedCount++
      }
    }

    return missedCount >= missedSundays
  }

  private async checkSeasonalDrop(churchId: string): Promise<boolean> {
    const now = new Date()
    const month = now.getMonth() + 1
    
    // Summer months (June-August) or holiday season (December-January)
    if ((month >= 6 && month <= 8) || month === 12 || month === 1) {
      const { data: currentAttendance } = await this.supabase
        .from('event_attendance')
        .select('id')
        .gte('check_in_time', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())

      const { data: previousAttendance } = await this.supabase
        .from('event_attendance')
        .select('id')
        .gte('check_in_time', new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString())
        .lt('check_in_time', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())

      const currentCount = currentAttendance?.length || 0
      const previousCount = previousAttendance?.length || 0

      return previousCount > 0 && (currentCount / previousCount) < 0.8
    }

    return false
  }

  // Communication Monitoring Methods
  private async checkEmailEngagement(memberId: string, weeks: number): Promise<boolean> {
    // This would integrate with email service provider APIs
    // For now, we'll simulate based on member activity
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7))

    // Check if member has any recent engagement
    const { data: recentActivity } = await this.supabase
      .from('event_attendance')
      .select('id')
      .eq('member_id', memberId)
      .gte('check_in_time', cutoffDate.toISOString())

    return !recentActivity || recentActivity.length === 0
  }

  private async checkContentInterest(memberId: string, contentType: string): Promise<boolean> {
    // This would track content clicks/engagement
    // Implementation depends on content tracking system
    return false // Placeholder
  }

  // Main monitoring methods
  async monitorMember(memberId: string, churchId: string): Promise<MonitoringResult[]> {
    const results: MonitoringResult[] = []

    for (const trigger of this.triggers) {
      const lastTriggerKey = `${trigger.id}_${memberId}`
      const lastTrigger = this.lastTriggerTimes.get(lastTriggerKey)
      
      // Check cooldown period
      if (lastTrigger && trigger.cooldownHours) {
        const hoursSinceLastTrigger = (Date.now() - lastTrigger.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastTrigger < trigger.cooldownHours) {
          continue
        }
      }

      try {
        const triggered = await trigger.condition({ memberId, churchId })
        
        if (triggered) {
          results.push({
            triggered: true,
            agentName: trigger.agentName,
            memberId,
            metadata: {
              triggerName: trigger.name,
              description: trigger.description
            },
            priority: trigger.priority
          })

          this.lastTriggerTimes.set(lastTriggerKey, new Date())
        }
      } catch (error) {
        console.error(`Error checking trigger ${trigger.name}:`, error)
      }
    }

    return results
  }

  async monitorAllMembers(churchId: string): Promise<MonitoringResult[]> {
    const { data: members } = await this.supabase
      .from('members')
      .select('id')
      .eq('church_id', churchId)
      .eq('member_status', 'active')

    if (!members) return []

    const allResults: MonitoringResult[] = []

    for (const member of members) {
      const results = await this.monitorMember(member.id, churchId)
      allResults.push(...results)
    }

    return allResults
  }

  async checkSpecificTrigger(triggerName: string, data: any): Promise<MonitoringResult | null> {
    const trigger = this.triggers.find(t => t.name === triggerName)
    if (!trigger) return null

    try {
      const triggered = await trigger.condition(data)
      
      if (triggered) {
        return {
          triggered: true,
          agentName: trigger.agentName,
          memberId: data.memberId,
          metadata: {
            triggerName: trigger.name,
            description: trigger.description,
            ...data
          },
          priority: trigger.priority
        }
      }
    } catch (error) {
      console.error(`Error checking specific trigger ${triggerName}:`, error)
    }

    return null
  }
}

export const churchEventMonitor = new ChurchEventMonitor()
