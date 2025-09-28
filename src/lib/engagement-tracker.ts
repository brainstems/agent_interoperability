import { NextRequest, NextResponse } from 'next/server'
import { getCRMEventPublisher } from './crm-event-publisher'
import { supabase } from './supabase'
import { verifyAuth } from './auth'

export interface EngagementEvent {
  type: 'page_view' | 'form_submission' | 'download' | 'video_play' | 'button_click' | 'search'
  memberId?: string
  churchId: string
  data: {
    page?: string
    url?: string
    referrer?: string
    userAgent?: string
    duration?: number
    formType?: string
    downloadFile?: string
    videoId?: string
    buttonId?: string
    searchQuery?: string
    [key: string]: any
  }
  sessionId?: string
  timestamp: string
}

export class EngagementTracker {
  private eventPublisher = getCRMEventPublisher()
  private sessionStore = new Map<string, { memberId?: string, churchId: string, startTime: number }>()

  // Track page views
  async trackPageView(
    request: NextRequest,
    response: NextResponse,
    memberId?: string,
    churchId?: string
  ): Promise<void> {
    try {
      const url = request.url
      const referrer = request.headers.get('referer') || ''
      const userAgent = request.headers.get('user-agent') || ''
      const sessionId = this.getSessionId(request)

      // Store session info
      if (memberId && churchId) {
        this.sessionStore.set(sessionId, {
          memberId,
          churchId,
          startTime: Date.now()
        })
      }

      // Get session info if not provided
      const sessionInfo = this.sessionStore.get(sessionId)
      const finalMemberId = memberId || sessionInfo?.memberId
      const finalChurchId = churchId || sessionInfo?.churchId

      if (finalMemberId && finalChurchId) {
        await this.eventPublisher.publishEngagementEvent(
          'website_visit',
          finalMemberId,
          finalChurchId,
          {
            page: this.extractPageName(url),
            url,
            referrer,
            userAgent,
            sessionId,
            timestamp: new Date().toISOString()
          }
        )

        // Store in member engagement events table
        await supabase.from('member_engagement_events').insert({
          member_id: finalMemberId,
          church_id: finalChurchId,
          engagement_type: 'page_view',
          engagement_score: 1,
          event_data: {
            page: this.extractPageName(url),
            url,
            referrer,
            userAgent,
            sessionId
          },
          source: 'web_tracker'
        })
      }
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }

  // Track form submissions
  async trackFormSubmission(
    formType: string,
    formData: any,
    memberId: string,
    churchId: string,
    sessionId?: string
  ): Promise<void> {
    try {
      await this.eventPublisher.publishEngagementEvent(
        'form_submission',
        memberId,
        churchId,
        {
          formType,
          formData: this.sanitizeFormData(formData),
          sessionId,
          timestamp: new Date().toISOString(),
          frequency: await this.getEngagementFrequency(memberId, 'form_submission')
        }
      )

      // Store in member engagement events table
      await supabase.from('member_engagement_events').insert({
        member_id: memberId,
        church_id: churchId,
        engagement_type: 'form_submission',
        engagement_score: 10,
        event_data: {
          formType,
          formData: this.sanitizeFormData(formData),
          sessionId
        },
        source: 'web_tracker'
      })
    } catch (error) {
      console.error('Failed to track form submission:', error)
    }
  }

  // Track email interactions (opens, clicks)
  async trackEmailInteraction(
    action: 'opened' | 'clicked',
    emailId: string,
    memberId: string,
    churchId: string,
    linkUrl?: string
  ): Promise<void> {
    try {
      const engagementType = action === 'opened' ? 'email_open' : 'email_click'
      const score = action === 'opened' ? 2 : 5

      await this.eventPublisher.publishEngagementEvent(
        engagementType,
        memberId,
        churchId,
        {
          emailId,
          linkUrl,
          timestamp: new Date().toISOString(),
          frequency: await this.getEngagementFrequency(memberId, engagementType)
        }
      )

      // Also publish communication event
      await this.eventPublisher.publishCommunicationEvent(
        action,
        emailId,
        churchId,
        {
          channel: 'email',
          recipientId: memberId,
          linkUrl
        }
      )

      // Store in member engagement events table
      await supabase.from('member_engagement_events').insert({
        member_id: memberId,
        church_id: churchId,
        engagement_type: engagementType,
        engagement_score: score,
        event_data: {
          emailId,
          linkUrl,
          action
        },
        source: 'email_tracker'
      })
    } catch (error) {
      console.error('Failed to track email interaction:', error)
    }
  }

  // Track attendance events
  async trackAttendance(
    eventId: string,
    memberId: string,
    churchId: string,
    attendanceType: 'checked_in' | 'checked_out' | 'absent'
  ): Promise<void> {
    try {
      if (attendanceType === 'absent') {
        // Track absence for follow-up
        await this.eventPublisher.publishMemberEvent(
          'absent',
          memberId,
          churchId,
          {
            eventId,
            absentDate: new Date().toISOString(),
            weeksAbsent: await this.calculateWeeksAbsent(memberId, churchId)
          }
        )
      } else {
        // Track attendance engagement
        await this.eventPublisher.publishEngagementEvent(
          'attendance',
          memberId,
          churchId,
          {
            eventId,
            attendanceType,
            timestamp: new Date().toISOString(),
            frequency: await this.getEngagementFrequency(memberId, 'attendance')
          }
        )

        // Store in member engagement events table
        await supabase.from('member_engagement_events').insert({
          member_id: memberId,
          church_id: churchId,
          engagement_type: 'attendance',
          engagement_score: 15,
          event_data: {
            eventId,
            attendanceType
          },
          source: 'attendance_tracker'
        })
      }
    } catch (error) {
      console.error('Failed to track attendance:', error)
    }
  }

  // Track member engagement patterns and trigger alerts
  async analyzeEngagementPatterns(memberId: string, churchId: string): Promise<void> {
    try {
      // Get engagement events from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { data: engagementEvents } = await supabase
        .from('member_engagement_events')
        .select('*')
        .eq('member_id', memberId)
        .eq('church_id', churchId)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })

      if (!engagementEvents || engagementEvents.length === 0) {
        // No recent engagement - trigger low engagement alert
        await this.eventPublisher.publishPastoralCareEvent(
          'care_needed',
          memberId,
          churchId,
          {
            reason: 'No engagement in last 30 days',
            priority: 'medium',
            notes: 'Member has not engaged with any church activities or communications recently',
            engagementScore: 0
          }
        )
        return
      }

      // Calculate engagement metrics
      const totalScore = engagementEvents.reduce((sum, event) => sum + (event.engagement_score || 0), 0)
      const avgScore = totalScore / engagementEvents.length
      const uniqueDays = new Set(engagementEvents.map(e => e.timestamp.split('T')[0])).size
      const engagementTypes = new Set(engagementEvents.map(e => e.engagement_type))

      // Detect patterns and trigger appropriate events
      if (totalScore > 100 && uniqueDays > 10) {
        // High engagement - potential volunteer candidate
        await this.eventPublisher.publishMemberEvent(
          'updated',
          memberId,
          churchId,
          {
            engagementLevel: 'high',
            engagementScore: totalScore,
            avgDailyScore: totalScore / 30,
            activeDays: uniqueDays,
            engagementTypes: Array.from(engagementTypes),
            volunteerCandidate: true,
            leadershipPotential: totalScore > 200
          }
        )
      } else if (totalScore < 10 && uniqueDays < 3) {
        // Low engagement - needs attention
        await this.eventPublisher.publishPastoralCareEvent(
          'care_needed',
          memberId,
          churchId,
          {
            reason: 'Low engagement detected',
            priority: 'medium',
            notes: `Member engagement score: ${totalScore}, active days: ${uniqueDays}`,
            engagementScore: totalScore,
            recommendedAction: 'personal_outreach'
          }
        )
      }

      // Check for declining engagement trend
      const recentEvents = engagementEvents.slice(0, 10)
      const olderEvents = engagementEvents.slice(-10)
      
      if (recentEvents.length > 0 && olderEvents.length > 0) {
        const recentAvg = recentEvents.reduce((sum, e) => sum + (e.engagement_score || 0), 0) / recentEvents.length
        const olderAvg = olderEvents.reduce((sum, e) => sum + (e.engagement_score || 0), 0) / olderEvents.length
        
        if (recentAvg < olderAvg * 0.5) {
          // Significant decline in engagement
          await this.eventPublisher.publishPastoralCareEvent(
            'care_needed',
            memberId,
            churchId,
            {
              reason: 'Declining engagement trend',
              priority: 'high',
              notes: `Engagement declined from ${olderAvg.toFixed(1)} to ${recentAvg.toFixed(1)}`,
              engagementTrend: 'declining',
              recommendedAction: 'immediate_follow_up'
            }
          )
        }
      }
    } catch (error) {
      console.error('Failed to analyze engagement patterns:', error)
    }
  }

  // Helper methods
  private getSessionId(request: NextRequest): string {
    // Try to get session ID from cookie or generate one
    const sessionCookie = request.cookies.get('session_id')
    if (sessionCookie) {
      return sessionCookie.value
    }
    
    // Generate new session ID
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private extractPageName(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      
      // Extract meaningful page name
      if (pathname === '/') return 'home'
      if (pathname.startsWith('/events')) return 'events'
      if (pathname.startsWith('/members')) return 'members'
      if (pathname.startsWith('/donations')) return 'donations'
      if (pathname.startsWith('/groups')) return 'groups'
      
      return pathname.split('/')[1] || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  private sanitizeFormData(formData: any): any {
    // Remove sensitive information from form data
    const sanitized = { ...formData }
    const sensitiveFields = ['password', 'ssn', 'credit_card', 'bank_account']
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })
    
    return sanitized
  }

  private async getEngagementFrequency(memberId: string, engagementType: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      const { count } = await supabase
        .from('member_engagement_events')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', memberId)
        .eq('engagement_type', engagementType)
        .gte('timestamp', sevenDaysAgo.toISOString())

      return count || 0
    } catch {
      return 0
    }
  }

  private async calculateWeeksAbsent(memberId: string, churchId: string): Promise<number> {
    try {
      // Get last attendance record
      const { data: lastAttendance } = await supabase
        .from('event_attendance')
        .select('check_in_time')
        .eq('member_id', memberId)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (!lastAttendance) return 0

      const lastAttendanceDate = new Date(lastAttendance.check_in_time)
      const now = new Date()
      const diffTime = now.getTime() - lastAttendanceDate.getTime()
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))

      return diffWeeks
    } catch {
      return 0
    }
  }
}

// Singleton instance
let engagementTracker: EngagementTracker | null = null

export function getEngagementTracker(): EngagementTracker {
  if (!engagementTracker) {
    engagementTracker = new EngagementTracker()
  }
  return engagementTracker
}

// Middleware function for Next.js
export async function trackEngagement(request: NextRequest, response: NextResponse) {
  try {
    // Only track for authenticated users
    const user = await verifyAuth(request)
    if (!user) return

    const tracker = getEngagementTracker()
    await tracker.trackPageView(request, response, user.id, user.churchId)
    
    // Periodically analyze engagement patterns (every 10th page view)
    if (Math.random() < 0.1) {
      await tracker.analyzeEngagementPatterns(user.id, user.churchId || '')
    }
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error('Engagement tracking failed:', error)
  }
}

// Helper functions for common tracking scenarios
export async function trackMemberRegistration(memberId: string, churchId: string, registrationData: any) {
  const tracker = getEngagementTracker()
  await tracker.trackFormSubmission('member_registration', registrationData, memberId, churchId)
}

export async function trackDonationSubmission(memberId: string, churchId: string, donationData: any) {
  const tracker = getEngagementTracker()
  await tracker.trackFormSubmission('donation', donationData, memberId, churchId)
}

export async function trackEventRegistration(memberId: string, churchId: string, eventData: any) {
  const tracker = getEngagementTracker()
  await tracker.trackFormSubmission('event_registration', eventData, memberId, churchId)
}
