/**
 * Next-Best Action (NBA) Engine
 * 
 * Generates personalized action recommendations based on:
 * - Propensity scores
 * - Member lifecycle stage
 * - Campaign context
 * - Recent interactions
 * - Optimal timing
 */

import { createClient } from '@/lib/supabase'
import { propensityModelService } from './propensity-models'

interface NBAContext {
  memberId: string
  churchId: string
  campaignId?: string
  currentDate?: Date
  excludeActionTypes?: string[]
  maxRecommendations?: number
}

interface NBARecommendation {
  action_type: string
  action_priority: number
  recommended_channel: string
  alternate_channels: string[]
  optimal_send_time: Date
  reasoning: string
  confidence_score: number
  supporting_signals: string[]
  recommended_subject?: string
  recommended_message_tone?: string
  personalization_tokens: Record<string, any>
}

interface ActionRule {
  action_type: string
  conditions: (context: any) => boolean
  priority: (context: any) => number
  channel: (context: any) => string
  reasoning: (context: any) => string
  confidence: (context: any) => number
}

export class NBAEngine {
  private supabase = createClient()
  private actionRules: ActionRule[]

  constructor() {
    this.actionRules = this.defineActionRules()
  }

  /**
   * Generate NBA recommendations for a member
   */
  async generateRecommendations(context: NBAContext): Promise<NBARecommendation[]> {
    const {
      memberId,
      churchId,
      campaignId,
      currentDate = new Date(),
      excludeActionTypes = [],
      maxRecommendations = 5
    } = context

    // Get propensity scores
    const propensityScores = await propensityModelService.getPropensityScores(memberId, campaignId)
    
    if (!propensityScores) {
      // Calculate if not exists
      await propensityModelService.calculatePropensityScores(memberId, churchId, campaignId)
      const scores = await propensityModelService.getPropensityScores(memberId, campaignId)
      if (!scores) throw new Error('Failed to generate propensity scores')
    }

    // Get member profile and recent activity
    const { data: member } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .single()

    // Get recent interactions
    const recentInteractions = await this.getRecentInteractions(memberId)

    // Get campaign context if provided
    let campaign = null
    if (campaignId) {
      const { data } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      campaign = data
    }

    // Build enriched context
    const enrichedContext = {
      member,
      propensityScores,
      recentInteractions,
      campaign,
      currentDate
    }

    // Evaluate all action rules
    const recommendations: NBARecommendation[] = []

    for (const rule of this.actionRules) {
      // Skip excluded actions
      if (excludeActionTypes.includes(rule.action_type)) continue

      // Check if conditions are met
      if (!rule.conditions(enrichedContext)) continue

      // Generate recommendation
      const priority = rule.priority(enrichedContext)
      const channel = rule.channel(enrichedContext)
      const reasoning = rule.reasoning(enrichedContext)
      const confidence = rule.confidence(enrichedContext)

      // Get optimal send time
      const optimalSendTime = await this.determineOptimalSendTime(memberId, channel)

      // Get personalization tokens
      const personalizationTokens = this.buildPersonalizationTokens(enrichedContext)

      recommendations.push({
        action_type: rule.action_type,
        action_priority: priority,
        recommended_channel: channel,
        alternate_channels: this.getAlternateChannels(channel, enrichedContext),
        optimal_send_time: optimalSendTime,
        reasoning,
        confidence_score: confidence,
        supporting_signals: this.extractSupportingSignals(enrichedContext, rule.action_type),
        recommended_message_tone: this.determineTone(enrichedContext, rule.action_type),
        personalization_tokens: personalizationTokens
      })
    }

    // Sort by priority and limit
    recommendations.sort((a, b) => b.action_priority - a.action_priority)
    const topRecommendations = recommendations.slice(0, maxRecommendations)

    // Store recommendations in database
    await this.storeRecommendations(memberId, churchId, campaignId, topRecommendations)

    return topRecommendations
  }

  /**
   * Define action rules
   */
  private defineActionRules(): ActionRule[] {
    return [
      // High-value donor re-engagement
      {
        action_type: 'recurring_ask',
        conditions: (ctx) => {
          return ctx.propensityScores.propensity_to_give > 0.7 &&
                 !ctx.propensityScores.features_used?.has_recurring &&
                 ctx.propensityScores.recurring_likelihood > 0.6
        },
        priority: (ctx) => Math.round(ctx.propensityScores.recurring_likelihood * 10),
        channel: (ctx) => ctx.member.email ? 'email' : 'phone',
        reasoning: (ctx) => 
          `Based on consistent giving history (${ctx.propensityScores.features_used?.gift_count_12m} gifts in 12 months) and high recurring likelihood (${Math.round(ctx.propensityScores.recurring_likelihood * 100)}%), this member is an excellent candidate for recurring giving. Setting up automatic monthly gifts would provide sustainable support.`,
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Lapsed donor re-engagement
      {
        action_type: 're_engagement',
        conditions: (ctx) => {
          const monthsSinceLast = ctx.propensityScores.features_used?.months_since_last_gift || 999
          return monthsSinceLast > 6 && monthsSinceLast < 24 &&
                 ctx.propensityScores.churn_risk_score > 0.5
        },
        priority: (ctx) => {
          const churnRisk = ctx.propensityScores.churn_risk_score
          return Math.round(churnRisk * 8) + 2 // Priority 2-10
        },
        channel: (ctx) => {
          // Personal touch for lapsed donors
          return ctx.propensityScores.capacity_tier === 'leadership_gift' ? 'phone' : 'email'
        },
        reasoning: (ctx) => 
          `This member last gave ${ctx.propensityScores.features_used?.months_since_last_gift} months ago and shows ${Math.round(ctx.propensityScores.churn_risk_score * 100)}% churn risk. A personal re-engagement message can help reconnect and understand any barriers to continued giving.`,
        confidence: (ctx) => Math.min(ctx.propensityScores.confidence_score * 1.2, 1)
      },

      // Volunteer recruitment
      {
        action_type: 'invite_to_serve',
        conditions: (ctx) => {
          return ctx.propensityScores.propensity_to_serve > 0.6 &&
                 ctx.propensityScores.features_used?.volunteer_hours_12m === 0
        },
        priority: (ctx) => Math.round(ctx.propensityScores.propensity_to_serve * 7),
        channel: (ctx) => 'email',
        reasoning: (ctx) => 
          `High propensity to serve (${Math.round(ctx.propensityScores.propensity_to_serve * 100)}%) based on attendance patterns and engagement. They attend regularly but haven't volunteered yet—a perfect candidate for volunteer recruitment.`,
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Thank you for recent gift
      {
        action_type: 'thank_you',
        conditions: (ctx) => {
          const daysSinceLast = ctx.propensityScores.features_used?.months_since_last_gift * 30 || 999
          return daysSinceLast < 7 && !ctx.recentInteractions.some((i: any) => i.type === 'thank_you')
        },
        priority: (ctx) => 9, // High priority
        channel: (ctx) => {
          // Major gifts get phone call
          const lastGift = ctx.propensityScores.features_used?.avg_gift_amount || 0
          return lastGift > 1000 ? 'phone' : 'email'
        },
        reasoning: (ctx) => 
          `Recent gift received within the last week. Prompt, personalized gratitude strengthens donor relationships and increases likelihood of future support.`,
        confidence: (ctx) => 1.0
      },

      // Upgrade ask for consistent donors
      {
        action_type: 'upgrade_ask',
        conditions: (ctx) => {
          return ctx.propensityScores.features_used?.gift_count_12m > 3 &&
                 ctx.propensityScores.propensity_to_give > 0.7 &&
                 ctx.campaign?.status === 'active'
        },
        priority: (ctx) => {
          const frequency = ctx.propensityScores.features_used?.gift_count_12m || 0
          return Math.min(Math.round(frequency / 2) + 5, 10)
        },
        channel: (ctx) => 'email',
        reasoning: (ctx) => 
          `Consistent donor with ${ctx.propensityScores.features_used?.gift_count_12m} gifts this year. Campaign "${ctx.campaign?.name}" provides a compelling opportunity to increase impact. Recommended ask: $${ctx.propensityScores.recommended_ask_amount}.`,
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Pledge prompt for active campaign
      {
        action_type: 'pledge_prompt',
        conditions: (ctx) => {
          return ctx.campaign?.status === 'active' &&
                 ctx.propensityScores.propensity_to_give > 0.5 &&
                 !ctx.recentInteractions.some((i: any) => i.type === 'pledge_received')
        },
        priority: (ctx) => {
          const daysUntilCommitment = ctx.campaign?.commitment_date 
            ? Math.ceil((new Date(ctx.campaign.commitment_date).getTime() - ctx.currentDate.getTime()) / (1000 * 60 * 60 * 24))
            : 30
          
          // Higher priority as commitment date approaches
          if (daysUntilCommitment < 7) return 9
          if (daysUntilCommitment < 14) return 7
          return 5
        },
        channel: (ctx) => 'email',
        reasoning: (ctx) => {
          const daysLeft = ctx.campaign?.commitment_date 
            ? Math.ceil((new Date(ctx.campaign.commitment_date).getTime() - ctx.currentDate.getTime()) / (1000 * 60 * 60 * 24))
            : null
          
          return `Active campaign "${ctx.campaign?.name}" ${daysLeft ? `with ${daysLeft} days until Commitment Sunday` : 'in progress'}. Member shows ${Math.round(ctx.propensityScores.propensity_to_give * 100)}% propensity to give. Timely pledge invitation can capture commitment.`
        },
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Event invitation based on attendance propensity
      {
        action_type: 'invite_to_event',
        conditions: (ctx) => {
          return ctx.propensityScores.propensity_to_attend > 0.6 &&
                 ctx.propensityScores.features_used?.events_attended_6m < 3
        },
        priority: (ctx) => Math.round(ctx.propensityScores.propensity_to_attend * 6),
        channel: (ctx) => 'email',
        reasoning: (ctx) => 
          `High propensity to attend (${Math.round(ctx.propensityScores.propensity_to_attend * 100)}%) but limited recent attendance. Personal invitation to upcoming events can rebuild engagement.`,
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Pastoral visit for high churn risk
      {
        action_type: 'pastoral_visit',
        conditions: (ctx) => {
          return ctx.propensityScores.churn_risk_score > 0.7 &&
                 ctx.propensityScores.features_used?.member_tenure_months > 12
        },
        priority: (ctx) => 10, // Highest priority
        channel: (ctx) => 'in_person',
        reasoning: (ctx) => 
          `Critical churn risk (${Math.round(ctx.propensityScores.churn_risk_score * 100)}%) for long-time member (${Math.floor(ctx.propensityScores.features_used?.member_tenure_months / 12)} years). Pastoral care visit needed to understand concerns and rebuild connection.`,
        confidence: (ctx) => ctx.propensityScores.confidence_score
      },

      // Planned giving discussion for major donors
      {
        action_type: 'planned_giving_discussion',
        conditions: (ctx) => {
          return ctx.propensityScores.capacity_tier === 'leadership_gift' &&
                 ctx.propensityScores.features_used?.member_tenure_months > 60 &&
                 !ctx.member.planned_giving_intent
        },
        priority: (ctx) => 8,
        channel: (ctx) => 'in_person',
        reasoning: (ctx) => 
          `Leadership-level donor (avg gift $${ctx.propensityScores.features_used?.avg_gift_amount}) with ${Math.floor(ctx.propensityScores.features_used?.member_tenure_months / 12)} years tenure. Excellent candidate for planned giving conversation to discuss legacy impact.`,
        confidence: (ctx) => 0.8
      }
    ]
  }

  /**
   * Get recent interactions for a member
   */
  private async getRecentInteractions(memberId: string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Check recent communications
    const { data: comms } = await this.supabase
      .from('communication_recipients')
      .select('*, communications(*)')
      .eq('member_id', memberId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Check recent pledges
    const { data: pledges } = await this.supabase
      .from('pledges')
      .select('*')
      .eq('member_id', memberId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    return [
      ...(comms || []).map(c => ({ type: 'communication', data: c })),
      ...(pledges || []).map(p => ({ type: 'pledge_received', data: p }))
    ]
  }

  /**
   * Determine optimal send time for member
   */
  private async determineOptimalSendTime(memberId: string, channel: string): Promise<Date> {
    // Check for send time profile
    const { data: profile } = await this.supabase
      .from('send_time_profiles')
      .select('*')
      .eq('member_id', memberId)
      .eq('is_active', true)
      .maybeSingle()

    const now = new Date()
    const optimalTime = new Date(now)

    if (profile && channel === 'email' && profile.email_optimal_hour) {
      // Use learned optimal time
      optimalTime.setHours(profile.email_optimal_hour, 0, 0, 0)
      
      // If that time has passed today, schedule for tomorrow
      if (optimalTime < now) {
        optimalTime.setDate(optimalTime.getDate() + 1)
      }
    } else {
      // Default optimal times by channel
      const defaults: Record<string, number> = {
        email: 10, // 10 AM
        sms: 14,   // 2 PM
        phone: 18  // 6 PM
      }
      
      optimalTime.setHours(defaults[channel] || 10, 0, 0, 0)
      
      // Schedule for next business day
      while (optimalTime.getDay() === 0 || optimalTime.getDay() === 6) {
        optimalTime.setDate(optimalTime.getDate() + 1)
      }
    }

    return optimalTime
  }

  /**
   * Build personalization tokens for messaging
   */
  private buildPersonalizationTokens(context: any): Record<string, any> {
    const member = context.member
    const propensity = context.propensityScores
    
    return {
      first_name: member.first_name,
      last_name: member.last_name,
      full_name: `${member.first_name} ${member.last_name}`,
      recommended_amount: propensity.recommended_ask_amount,
      avg_gift_amount: propensity.features_used?.avg_gift_amount || 0,
      last_gift_date: propensity.features_used?.months_since_last_gift 
        ? `${propensity.features_used.months_since_last_gift} months ago`
        : 'recently',
      campaign_name: context.campaign?.name,
      member_tenure_years: Math.floor((propensity.features_used?.member_tenure_months || 0) / 12)
    }
  }

  /**
   * Get alternate communication channels
   */
  private getAlternateChannels(primary: string, context: any): string[] {
    const member = context.member
    const available = []

    if (member.email && primary !== 'email') available.push('email')
    if (member.phone && primary !== 'sms') available.push('sms')
    if (member.phone && primary !== 'phone') available.push('phone')
    if (primary !== 'letter') available.push('letter')

    return available
  }

  /**
   * Extract supporting signals for reasoning
   */
  private extractSupportingSignals(context: any, actionType: string): string[] {
    const signals = []
    const features = context.propensityScores.features_used

    if (features.gift_count_12m > 0) {
      signals.push(`${features.gift_count_12m} gifts in past 12 months`)
    }
    if (features.attendance_rate_12m > 0.5) {
      signals.push(`${Math.round(features.attendance_rate_12m * 100)}% attendance rate`)
    }
    if (features.has_recurring) {
      signals.push('Active recurring donor')
    }
    if (features.volunteer_hours_12m > 0) {
      signals.push(`${features.volunteer_hours_12m} volunteer hours`)
    }
    if (features.small_group_member) {
      signals.push('Small group member')
    }

    return signals
  }

  /**
   * Determine appropriate message tone
   */
  private determineTone(context: any, actionType: string): string {
    const churnRisk = context.propensityScores.churn_risk_score
    const capacity = context.propensityScores.capacity_tier

    if (actionType === 'pastoral_visit' || churnRisk > 0.7) return 'warm'
    if (capacity === 'leadership_gift') return 'formal'
    if (actionType === 'thank_you') return 'grateful'
    
    return 'friendly'
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(
    memberId: string,
    churchId: string,
    campaignId: string | undefined,
    recommendations: NBARecommendation[]
  ) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Valid for 7 days

    const records = recommendations.map(rec => ({
      church_id: churchId,
      member_id: memberId,
      campaign_id: campaignId,
      action_type: rec.action_type,
      action_priority: rec.action_priority,
      recommended_channel: rec.recommended_channel,
      alternate_channels: rec.alternate_channels,
      optimal_send_time: rec.optimal_send_time.toISOString(),
      reasoning: rec.reasoning,
      confidence_score: rec.confidence_score,
      supporting_signals: rec.supporting_signals,
      recommended_message_tone: rec.recommended_message_tone,
      personalization_tokens: rec.personalization_tokens,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_by_model: 'nba_engine_v1'
    }))

    await this.supabase.from('nba_recommendations').insert(records)
  }

  /**
   * Get active recommendations for a member
   */
  async getRecommendations(memberId: string, limit = 5) {
    const { data } = await this.supabase
      .from('nba_recommendations')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('action_priority', { ascending: false })
      .limit(limit)

    return data
  }

  /**
   * Mark recommendation as executed
   */
  async executeRecommendation(recommendationId: string, notes?: string) {
    await this.supabase
      .from('nba_recommendations')
      .update({
        status: 'sent',
        executed_at: new Date().toISOString(),
        response_notes: notes
      })
      .eq('id', recommendationId)
  }

  /**
   * Batch generate recommendations for campaign
   */
  async generateCampaignRecommendations(campaignId: string, churchId: string) {
    // Get all active members
    const { data: members } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)

    if (!members) return []

    const results = []
    for (const member of members) {
      try {
        const recs = await this.generateRecommendations({
          memberId: member.id,
          churchId,
          campaignId,
          maxRecommendations: 3
        })
        results.push({ memberId: member.id, recommendations: recs })
      } catch (error) {
        console.error(`Failed to generate recommendations for ${member.id}:`, error)
      }
    }

    return results
  }
}

export const nbaEngine = new NBAEngine()
