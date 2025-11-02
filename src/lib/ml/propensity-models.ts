/**
 * Propensity Scoring Models
 * 
 * ML models for predicting member behavior:
 * - Propensity to give
 * - Propensity to serve (volunteer)
 * - Propensity to attend
 * - Churn risk
 * - Giving capacity tier
 */

import { createClient } from '@/lib/supabase'

interface MemberFeatures {
  // Giving history
  lifetime_giving: number
  avg_gift_amount: number
  gift_count_12m: number
  gift_count_6m: number
  months_since_last_gift: number
  has_recurring: boolean
  recurring_amount: number
  
  // Engagement
  attendance_rate_12m: number
  events_attended_6m: number
  small_group_member: boolean
  volunteer_hours_12m: number
  
  // Demographics
  member_tenure_months: number
  age?: number
  marital_status?: string
  has_children: boolean
  
  // Communication engagement
  email_open_rate: number
  email_click_rate: number
  sms_response_rate: number
  
  // Lifecycle
  is_new_member: boolean
  is_lapsed: boolean
  days_since_last_interaction: number
}

interface PropensityScores {
  propensity_to_give: number
  propensity_to_serve: number
  propensity_to_attend: number
  churn_risk_score: number
  engagement_score: number
  capacity_tier: 'leadership_gift' | 'major_gift' | 'regular_gift' | 'modest_gift' | 'first_time'
  recommended_ask_amount: number
  recommended_ask_range_min: number
  recommended_ask_range_max: number
  recurring_likelihood: number
  recommended_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  confidence_score: number
  top_influencing_factors: { factor: string; importance: number }[]
}

export class PropensityModelService {
  private supabase = createClient()

  /**
   * Extract features for a member
   */
  async extractFeatures(memberId: string, churchId: string): Promise<MemberFeatures> {
    // Get member profile
    const { data: member } = await this.supabase
      .from('profiles')
      .select('*, families!inner(*)')
      .eq('id', memberId)
      .single()

    if (!member) {
      throw new Error('Member not found')
    }

    // Calculate giving features
    const givingFeatures = await this.calculateGivingFeatures(memberId)
    
    // Calculate engagement features
    const engagementFeatures = await this.calculateEngagementFeatures(memberId)
    
    // Calculate communication features
    const commFeatures = await this.calculateCommunicationFeatures(memberId)

    // Calculate age if birth_date exists
    const age = member.birth_date 
      ? Math.floor((Date.now() - new Date(member.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined

    // Calculate member tenure
    const tenureMonths = member.join_date
      ? Math.floor((Date.now() - new Date(member.join_date).getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0

    return {
      ...givingFeatures,
      ...engagementFeatures,
      ...commFeatures,
      member_tenure_months: tenureMonths,
      age,
      marital_status: member.marital_status,
      has_children: false, // Would need to query family_members table
      is_new_member: tenureMonths < 6,
      is_lapsed: givingFeatures.months_since_last_gift > 6,
      days_since_last_interaction: 0 // Would calculate from various tables
    }
  }

  /**
   * Calculate giving-related features
   */
  private async calculateGivingFeatures(memberId: string) {
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

    // Get donation history
    const { data: donations } = await this.supabase
      .from('donations')
      .select('amount, donation_date, is_recurring')
      .eq('donor_id', memberId)
      .order('donation_date', { ascending: false })

    if (!donations || donations.length === 0) {
      return {
        lifetime_giving: 0,
        avg_gift_amount: 0,
        gift_count_12m: 0,
        gift_count_6m: 0,
        months_since_last_gift: 999,
        has_recurring: false,
        recurring_amount: 0
      }
    }

    const lifetimeGiving = donations.reduce((sum, d) => sum + Number(d.amount), 0)
    const avgGift = lifetimeGiving / donations.length

    const donations12m = donations.filter(d => new Date(d.donation_date) >= twelveMonthsAgo)
    const donations6m = donations.filter(d => new Date(d.donation_date) >= sixMonthsAgo)

    const lastGiftDate = new Date(donations[0].donation_date)
    const monthsSinceLastGift = Math.floor((now.getTime() - lastGiftDate.getTime()) / (30 * 24 * 60 * 60 * 1000))

    // Check for recurring donations
    const { data: recurring } = await this.supabase
      .from('recurring_donations')
      .select('amount')
      .eq('member_id', memberId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    return {
      lifetime_giving: lifetimeGiving,
      avg_gift_amount: avgGift,
      gift_count_12m: donations12m.length,
      gift_count_6m: donations6m.length,
      months_since_last_gift: monthsSinceLastGift,
      has_recurring: !!recurring,
      recurring_amount: recurring ? Number(recurring.amount) : 0
    }
  }

  /**
   * Calculate engagement features
   */
  private async calculateEngagementFeatures(memberId: string) {
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

    // Get attendance
    const { data: attendance } = await this.supabase
      .from('event_attendance')
      .select('*, events!inner(start_datetime)')
      .eq('member_id', memberId)
      .eq('attended', true)
      .gte('events.start_datetime', twelveMonthsAgo.toISOString())

    const eventsCount12m = attendance?.length || 0
    const eventsCount6m = attendance?.filter(a => 
      new Date(a.events.start_datetime) >= sixMonthsAgo
    ).length || 0

    // Calculate attendance rate (attended / total events in period)
    const { count: totalEvents } = await this.supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_datetime', twelveMonthsAgo.toISOString())

    const attendanceRate = totalEvents ? eventsCount12m / totalEvents : 0

    // Check small group membership
    const { data: groupMembership } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle()

    // Get volunteer hours (if time pledge fulfillments exist)
    const { data: volunteerHours } = await this.supabase
      .from('time_pledge_fulfillments')
      .select('hours_logged')
      .eq('pledge_id', memberId) // This would need proper join through pledges table
      .gte('activity_date', twelveMonthsAgo.toISOString())

    const totalVolunteerHours = volunteerHours?.reduce((sum, v) => sum + Number(v.hours_logged), 0) || 0

    return {
      attendance_rate_12m: attendanceRate,
      events_attended_6m: eventsCount6m,
      small_group_member: !!groupMembership,
      volunteer_hours_12m: totalVolunteerHours
    }
  }

  /**
   * Calculate communication engagement features
   */
  private async calculateCommunicationFeatures(memberId: string) {
    // This would integrate with journey_step_executions or communications tracking
    // For now, return defaults
    return {
      email_open_rate: 0.5,
      email_click_rate: 0.2,
      sms_response_rate: 0.3
    }
  }

  /**
   * Calculate propensity scores using a simple rule-based model
   * In production, this would call an external ML service (AWS SageMaker, Azure ML, etc.)
   */
  async calculatePropensityScores(
    memberId: string,
    churchId: string,
    campaignId?: string
  ): Promise<PropensityScores> {
    // Extract features
    const features = await this.extractFeatures(memberId, churchId)

    // Simple rule-based scoring (replace with actual ML model)
    const propensityToGive = this.calculateGivingPropensity(features)
    const propensityToServe = this.calculateServingPropensity(features)
    const propensityToAttend = this.calculateAttendancePropensity(features)
    const churnRisk = this.calculateChurnRisk(features)
    const engagementScore = this.calculateEngagementScore(features)

    // Determine capacity tier
    const capacityTier = this.determineCapacityTier(features)

    // Calculate recommended ask amount
    const { askAmount, askMin, askMax } = this.calculateRecommendedAsk(features, capacityTier)

    // Determine recurring likelihood
    const recurringLikelihood = this.calculateRecurringLikelihood(features)
    const recommendedFrequency = this.determineRecommendedFrequency(features)

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(features)

    // Identify top influencing factors
    const topFactors = this.identifyTopFactors(features)

    // Store in database
    await this.storePropensityScores(memberId, churchId, campaignId, {
      propensity_to_give: propensityToGive,
      propensity_to_serve: propensityToServe,
      propensity_to_attend: propensityToAttend,
      churn_risk_score: churnRisk,
      engagement_score: engagementScore,
      capacity_tier: capacityTier,
      recommended_ask_amount: askAmount,
      recommended_ask_range_min: askMin,
      recommended_ask_range_max: askMax,
      recurring_likelihood: recurringLikelihood,
      recommended_frequency: recommendedFrequency,
      confidence_score: confidenceScore,
      top_influencing_factors: topFactors
    }, features)

    return {
      propensity_to_give: propensityToGive,
      propensity_to_serve: propensityToServe,
      propensity_to_attend: propensityToAttend,
      churn_risk_score: churnRisk,
      engagement_score: engagementScore,
      capacity_tier: capacityTier,
      recommended_ask_amount: askAmount,
      recommended_ask_range_min: askMin,
      recommended_ask_range_max: askMax,
      recurring_likelihood: recurringLikelihood,
      recommended_frequency: recommendedFrequency,
      confidence_score: confidenceScore,
      top_influencing_factors: topFactors
    }
  }

  /**
   * Simple rule-based propensity calculations
   * In production, replace with actual ML model inference
   */
  private calculateGivingPropensity(features: MemberFeatures): number {
    let score = 0.5 // Base score

    // Recent giving history
    if (features.gift_count_6m > 0) score += 0.2
    if (features.gift_count_12m > 3) score += 0.1
    if (features.months_since_last_gift < 3) score += 0.1
    if (features.has_recurring) score += 0.15

    // Engagement
    if (features.attendance_rate_12m > 0.5) score += 0.1
    if (features.small_group_member) score += 0.05

    // Constrain to 0-1
    return Math.min(Math.max(score, 0), 1)
  }

  private calculateServingPropensity(features: MemberFeatures): number {
    let score = 0.4

    if (features.volunteer_hours_12m > 0) score += 0.3
    if (features.volunteer_hours_12m > 20) score += 0.2
    if (features.attendance_rate_12m > 0.6) score += 0.1
    if (features.small_group_member) score += 0.1

    return Math.min(Math.max(score, 0), 1)
  }

  private calculateAttendancePropensity(features: MemberFeatures): number {
    let score = features.attendance_rate_12m

    if (features.events_attended_6m > 5) score += 0.1
    if (features.small_group_member) score += 0.15
    if (features.has_children) score += 0.05

    return Math.min(Math.max(score, 0), 1)
  }

  private calculateChurnRisk(features: MemberFeatures): number {
    let risk = 0.2 // Base risk

    if (features.months_since_last_gift > 6) risk += 0.3
    if (features.attendance_rate_12m < 0.2) risk += 0.2
    if (features.days_since_last_interaction > 90) risk += 0.2
    if (features.is_lapsed) risk += 0.25

    // Protective factors
    if (features.has_recurring) risk -= 0.2
    if (features.small_group_member) risk -= 0.15

    return Math.min(Math.max(risk, 0), 1)
  }

  private calculateEngagementScore(features: MemberFeatures): number {
    const weights = {
      attendance: 0.3,
      giving: 0.3,
      serving: 0.2,
      communication: 0.2
    }

    const score = 
      (features.attendance_rate_12m * weights.attendance) +
      (Math.min(features.gift_count_12m / 12, 1) * weights.giving) +
      (Math.min(features.volunteer_hours_12m / 50, 1) * weights.serving) +
      (features.email_open_rate * weights.communication)

    return Math.min(Math.max(score, 0), 1)
  }

  private determineCapacityTier(features: MemberFeatures): PropensityScores['capacity_tier'] {
    if (features.avg_gift_amount > 10000) return 'leadership_gift'
    if (features.avg_gift_amount > 2500) return 'major_gift'
    if (features.avg_gift_amount > 500) return 'regular_gift'
    if (features.lifetime_giving > 0) return 'modest_gift'
    return 'first_time'
  }

  private calculateRecommendedAsk(features: MemberFeatures, tier: string) {
    // Simple heuristic: 10-20% increase over average, or tier-based for new donors
    if (features.avg_gift_amount > 0) {
      const askAmount = Math.round(features.avg_gift_amount * 1.15)
      return {
        askAmount,
        askMin: Math.round(askAmount * 0.8),
        askMax: Math.round(askAmount * 1.3)
      }
    }

    // New donor defaults by capacity signals
    const defaults: Record<string, number> = {
      leadership_gift: 5000,
      major_gift: 1000,
      regular_gift: 250,
      modest_gift: 100,
      first_time: 50
    }

    const askAmount = defaults[tier] || 50
    return {
      askAmount,
      askMin: Math.round(askAmount * 0.5),
      askMax: Math.round(askAmount * 2)
    }
  }

  private calculateRecurringLikelihood(features: MemberFeatures): number {
    let likelihood = 0.3

    if (features.has_recurring) return 0.9
    if (features.gift_count_12m > 6) likelihood += 0.3
    if (features.attendance_rate_12m > 0.5) likelihood += 0.2
    if (features.email_open_rate > 0.6) likelihood += 0.1

    return Math.min(Math.max(likelihood, 0), 1)
  }

  private determineRecommendedFrequency(features: MemberFeatures): PropensityScores['recommended_frequency'] {
    if (features.gift_count_12m > 24) return 'weekly'
    if (features.gift_count_12m > 20) return 'biweekly'
    if (features.gift_count_12m > 6) return 'monthly'
    if (features.gift_count_12m > 2) return 'quarterly'
    return 'annually'
  }

  private calculateConfidenceScore(features: MemberFeatures): number {
    // Confidence based on data completeness and recency
    let confidence = 0.5

    if (features.gift_count_12m > 0) confidence += 0.2
    if (features.events_attended_6m > 0) confidence += 0.1
    if (features.months_since_last_gift < 6) confidence += 0.1
    if (features.member_tenure_months > 12) confidence += 0.1

    return Math.min(confidence, 1)
  }

  private identifyTopFactors(features: MemberFeatures): { factor: string; importance: number }[] {
    const factors = [
      { factor: 'giving_history', importance: features.gift_count_12m / 12 },
      { factor: 'attendance_rate', importance: features.attendance_rate_12m },
      { factor: 'recurring_donor', importance: features.has_recurring ? 1 : 0 },
      { factor: 'volunteer_engagement', importance: Math.min(features.volunteer_hours_12m / 50, 1) },
      { factor: 'small_group_member', importance: features.small_group_member ? 1 : 0 },
      { factor: 'member_tenure', importance: Math.min(features.member_tenure_months / 60, 1) }
    ]

    return factors
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
  }

  /**
   * Store propensity scores in database
   */
  private async storePropensityScores(
    memberId: string,
    churchId: string,
    campaignId: string | undefined,
    scores: PropensityScores,
    features: MemberFeatures
  ) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Scores valid for 30 days

    await this.supabase.from('member_propensity_scores').insert({
      church_id: churchId,
      member_id: memberId,
      campaign_id: campaignId,
      model_name: 'propensity_v1',
      model_version: '1.0',
      model_type: 'propensity_to_give',
      propensity_to_give: scores.propensity_to_give,
      propensity_to_serve: scores.propensity_to_serve,
      propensity_to_attend: scores.propensity_to_attend,
      churn_risk_score: scores.churn_risk_score,
      engagement_score: scores.engagement_score,
      capacity_tier: scores.capacity_tier,
      recommended_ask_amount: scores.recommended_ask_amount,
      recommended_ask_range_min: scores.recommended_ask_range_min,
      recommended_ask_range_max: scores.recommended_ask_range_max,
      recurring_likelihood: scores.recurring_likelihood,
      recommended_frequency: scores.recommended_frequency,
      confidence_score: scores.confidence_score,
      top_influencing_factors: scores.top_influencing_factors,
      features_used: features,
      expires_at: expiresAt.toISOString()
    })
  }

  /**
   * Get cached propensity scores for a member
   */
  async getPropensityScores(memberId: string, campaignId?: string) {
    const query = this.supabase
      .from('member_propensity_scores')
      .select('*')
      .eq('member_id', memberId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('computed_at', { ascending: false })

    if (campaignId) {
      query.eq('campaign_id', campaignId)
    }

    const { data } = await query.limit(1).maybeSingle()
    return data
  }

  /**
   * Batch calculate propensity scores for all members in a church
   */
  async batchCalculateScores(churchId: string, campaignId?: string) {
    const { data: members } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)

    if (!members) return

    const results = []
    for (const member of members) {
      try {
        const scores = await this.calculatePropensityScores(member.id, churchId, campaignId)
        results.push({ memberId: member.id, success: true, scores })
      } catch (error) {
        results.push({ memberId: member.id, success: false, error })
      }
    }

    return results
  }
}

export const propensityModelService = new PropensityModelService()
