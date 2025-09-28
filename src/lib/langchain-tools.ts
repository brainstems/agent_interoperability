import { StructuredTool } from '@langchain/core/tools'
import { supabase } from './supabase'
import { z } from 'zod'

// Base Church Tool class with common functionality
abstract class ChurchTool extends StructuredTool {
  protected churchId: string

  constructor(churchId: string) {
    super()
    this.churchId = churchId
  }

  protected async getChurchMembers(filters: any = {}) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('church_id', this.churchId)
      .match(filters)

    if (error) throw new Error(`Error fetching members: ${error.message}`)
    return data || []
  }

  protected async getChurchEvents(filters: any = {}) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('church_id', this.churchId)
      .match(filters)

    if (error) throw new Error(`Error fetching events: ${error.message}`)
    return data || []
  }

  protected async createNotification(notification: any) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...notification, church_id: this.churchId })
      .select()
      .single()

    if (error) throw new Error(`Error creating notification: ${error.message}`)
    return data
  }
}

// Member Lookup Tool
export class MemberLookupTool extends ChurchTool {
  name = 'member_lookup'
  description = 'Look up church members by name, email, role, or other criteria'

  schema = z.object({
    search_term: z.string().describe('Name, email, or search term'),
    role: z.string().optional().describe('Filter by member role'),
    member_status: z.string().optional().describe('Filter by member status'),
    is_active: z.boolean().optional().describe('Filter by active status')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role, member_status, is_active, last_login')
        .eq('church_id', this.churchId)

      if (input.search_term) {
        query = query.or(`first_name.ilike.%${input.search_term}%,last_name.ilike.%${input.search_term}%,email.ilike.%${input.search_term}%`)
      }

      if (input.role) {
        query = query.eq('role', input.role)
      }

      if (input.member_status) {
        query = query.eq('member_status', input.member_status)
      }

      if (input.is_active !== undefined) {
        query = query.eq('is_active', input.is_active)
      }

      const { data, error } = await query.limit(20)

      if (error) throw error

      return JSON.stringify({
        found: data?.length || 0,
        members: data?.map(member => ({
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          phone: member.phone,
          role: member.role,
          status: member.member_status,
          active: member.is_active,
          last_login: member.last_login
        })) || []
      })
    } catch (error) {
      return JSON.stringify({ error: `Failed to lookup members: ${error}` })
    }
  }
}

// Communication Sender Tool
export class CommunicationSenderTool extends ChurchTool {
  name = 'communication_sender'
  description = 'Send communications (email, SMS) to church members'

  schema = z.object({
    recipient_ids: z.array(z.string()).describe('Array of member IDs to send to'),
    channel: z.enum(['EMAIL', 'SMS', 'PUSH_NOTIFICATION']).describe('Communication channel'),
    subject: z.string().optional().describe('Subject line for email'),
    message: z.string().describe('Message content'),
    template: z.string().optional().describe('Template name to use'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const notifications = input.recipient_ids.map(userId => ({
        church_id: this.churchId,
        user_id: userId,
        channel: input.channel,
        subject: input.subject,
        content: input.message,
        template: input.template,
        status: 'PENDING',
        payload: { priority: input.priority }
      }))

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) throw error

      return JSON.stringify({
        success: true,
        notifications_created: data?.length || 0,
        message: `Successfully queued ${data?.length || 0} notifications for delivery`
      })
    } catch (error) {
      return JSON.stringify({ error: `Failed to send communications: ${error}` })
    }
  }
}

// Member Matching Tool
export class MemberMatchingTool extends ChurchTool {
  name = 'member_matching'
  description = 'Find potential member connections based on interests, life stage, and compatibility'

  schema = z.object({
    member_id: z.string().describe('ID of the member to find matches for'),
    similarity_threshold: z.number().min(0).max(1).default(0.7).describe('Minimum similarity score'),
    max_matches: z.number().min(1).max(10).default(5).describe('Maximum number of matches to return'),
    match_criteria: z.array(z.enum(['interests', 'life_stage', 'ministry', 'location'])).default(['interests'])
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Get the target member's profile
      const { data: targetMember, error: memberError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', input.member_id)
        .eq('church_id', this.churchId)
        .single()

      if (memberError || !targetMember) {
        throw new Error('Member not found')
      }

      // Use vector similarity search if available
      const { data: matches, error: matchError } = await supabase
        .rpc('find_matching_profiles', {
          target_profile_id: input.member_id,
          similarity_threshold: input.similarity_threshold,
          limit_count: input.max_matches
        })

      if (matchError) {
        // Fallback to basic matching
        const { data: allMembers } = await supabase
          .from('profiles')
          .select('*')
          .eq('church_id', this.churchId)
          .neq('id', input.member_id)
          .eq('is_active', true)

        const basicMatches = allMembers?.slice(0, input.max_matches).map(member => ({
          profile_id: member.id,
          similarity_score: 0.5,
          connection_score: 0.5
        })) || []

        return JSON.stringify({
          target_member: `${targetMember.first_name} ${targetMember.last_name}`,
          matches_found: basicMatches.length,
          matches: basicMatches
        })
      }

      return JSON.stringify({
        target_member: `${targetMember.first_name} ${targetMember.last_name}`,
        matches_found: matches?.length || 0,
        matches: matches || []
      })
    } catch (error) {
      return JSON.stringify({ error: `Failed to find member matches: ${error}` })
    }
  }
}

// Care Scheduler Tool
export class CareSchedulerTool extends ChurchTool {
  name = 'care_scheduler'
  description = 'Schedule pastoral care visits and follow-ups'

  schema = z.object({
    member_id: z.string().describe('ID of the member needing care'),
    care_type: z.enum(['VISIT', 'CALL', 'EMAIL', 'PRAYER']).describe('Type of care needed'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    reason: z.string().describe('Reason for pastoral care'),
    notes: z.string().optional().describe('Additional notes'),
    scheduled_date: z.string().optional().describe('Preferred date for care (ISO format)')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', input.member_id)
        .eq('church_id', this.churchId)
        .single()

      if (memberError || !member) {
        throw new Error('Member not found')
      }

      // Find available clergy/staff for assignment
      const { data: caregivers, error: caregiversError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('church_id', this.churchId)
        .in('role', ['ADMIN', 'CLERGY', 'STAFF'])
        .eq('is_active', true)

      if (caregiversError || !caregivers?.length) {
        throw new Error('No caregivers available')
      }

      // Create care task
      const careTask = {
        church_id: this.churchId,
        task_type: 'pastoral_care',
        payload: {
          member_id: input.member_id,
          member_name: `${member.first_name} ${member.last_name}`,
          care_type: input.care_type,
          reason: input.reason,
          notes: input.notes,
          priority: input.priority
        },
        priority: input.priority === 'URGENT' ? 10 : input.priority === 'HIGH' ? 8 : 5,
        scheduled_at: input.scheduled_date || new Date().toISOString()
      }

      const { data: task, error: taskError } = await supabase
        .from('agent_tasks')
        .insert(careTask)
        .select()
        .single()

      if (taskError) throw taskError

      // Notify caregivers
      const notifications = caregivers.map(caregiver => ({
        church_id: this.churchId,
        user_id: caregiver.id,
        channel: 'EMAIL',
        subject: `Pastoral Care Needed: ${member.first_name} ${member.last_name}`,
        content: `${member.first_name} ${member.last_name} needs ${input.care_type.toLowerCase()} care. Reason: ${input.reason}`,
        payload: { task_id: task.id, priority: input.priority },
        status: 'PENDING'
      }))

      await supabase.from('notifications').insert(notifications)

      return JSON.stringify({
        success: true,
        task_id: task.id,
        member_name: `${member.first_name} ${member.last_name}`,
        care_type: input.care_type,
        caregivers_notified: caregivers.length,
        message: `Pastoral care scheduled for ${member.first_name} ${member.last_name}`
      })
    } catch (error) {
      return JSON.stringify({ error: `Failed to schedule care: ${error}` })
    }
  }
}

// Event Analyzer Tool
export class EventAnalyzerTool extends ChurchTool {
  name = 'event_analyzer'
  description = 'Analyze church events for attendance, engagement, and follow-up opportunities'

  schema = z.object({
    event_id: z.string().optional().describe('Specific event ID to analyze'),
    date_range: z.object({
      start: z.string().describe('Start date (ISO format)'),
      end: z.string().describe('End date (ISO format)')
    }).optional().describe('Date range for analysis'),
    event_type: z.string().optional().describe('Filter by event type'),
    include_attendance: z.boolean().default(true).describe('Include attendance analysis')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('church_id', this.churchId)

      if (input.event_id) {
        query = query.eq('id', input.event_id)
      }

      if (input.date_range) {
        query = query
          .gte('start_datetime', input.date_range.start)
          .lte('start_datetime', input.date_range.end)
      }

      if (input.event_type) {
        query = query.eq('event_type', input.event_type)
      }

      const { data: events, error } = await query.order('start_datetime', { ascending: false })

      if (error) throw error

      const analysis = {
        total_events: events?.length || 0,
        events_analyzed: events?.map(event => ({
          id: event.id,
          title: event.title,
          type: event.event_type,
          date: event.start_datetime,
          max_attendees: event.max_attendees,
          registration_required: event.registration_required,
          is_public: event.is_public
        })) || [],
        insights: {
          most_common_type: this.getMostCommonEventType(events || []),
          upcoming_events: events?.filter(e => new Date(e.start_datetime) > new Date()).length || 0,
          past_events: events?.filter(e => new Date(e.start_datetime) <= new Date()).length || 0
        }
      }

      return JSON.stringify(analysis)
    } catch (error) {
      return JSON.stringify({ error: `Failed to analyze events: ${error}` })
    }
  }

  private getMostCommonEventType(events: any[]): string {
    const typeCounts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(typeCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'
  }
}

// Giving Analyzer Tool
export class GivingAnalyzerTool extends ChurchTool {
  name = 'giving_analyzer'
  description = 'Analyze giving patterns and generate stewardship insights'

  schema = z.object({
    time_period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    include_trends: z.boolean().default(true),
    member_id: z.string().optional().describe('Analyze specific member giving'),
    fund_type: z.string().optional().describe('Filter by fund type')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Note: This would typically query a donations table
      // For now, we'll return mock analysis data
      const analysis = {
        period: input.time_period,
        total_giving: 12500,
        number_of_givers: 85,
        average_gift: 147.06,
        trends: input.include_trends ? {
          growth_rate: 3.2,
          consistency_score: 0.87,
          new_givers: 5,
          lapsed_givers: 2
        } : undefined,
        insights: [
          'Monthly giving is 3% above target',
          'Consistent givers represent 85% of members',
          '5 new givers joined this month',
          'Digital giving adoption is increasing'
        ],
        recommendations: [
          'Send appreciation messages to consistent givers',
          'Follow up with members who haven\'t given recently',
          'Consider promoting digital giving options',
          'Plan stewardship testimony for next service'
        ]
      }

      return JSON.stringify(analysis)
    } catch (error) {
      return JSON.stringify({ error: `Failed to analyze giving: ${error}` })
    }
  }
}

// Introduction Creator Tool
export class IntroductionCreatorTool extends ChurchTool {
  name = 'introduction_creator'
  description = 'Create personalized introductions between church members'

  schema = z.object({
    member1_id: z.string().describe('First member ID'),
    member2_id: z.string().describe('Second member ID'),
    introduction_type: z.enum(['MUTUAL_INTEREST', 'MINISTRY_MATCH', 'LIFE_STAGE', 'SKILL_SHARE', 'PASTORAL_CARE']),
    custom_message: z.string().optional().describe('Custom introduction message'),
    schedule_delay_hours: z.number().default(0).describe('Hours to delay sending introduction')
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Get member profiles
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, interests, bio')
        .in('id', [input.member1_id, input.member2_id])
        .eq('church_id', this.churchId)

      if (error || !members || members.length !== 2) {
        throw new Error('Could not find both members')
      }

      const [member1, member2] = members

      // Create introduction request
      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + input.schedule_delay_hours)

      const introduction = {
        church_id: this.churchId,
        requester_id: 'system',
        member1_id: input.member1_id,
        member2_id: input.member2_id,
        introduction_type: input.introduction_type,
        message: input.custom_message || this.generateIntroductionMessage(member1, member2, input.introduction_type),
        status: 'PENDING',
        scheduled_at: scheduledAt.toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        metadata: {
          generated_by: 'ai_agent',
          common_interests: this.findCommonInterests(member1, member2)
        }
      }

      const { data: introData, error: introError } = await supabase
        .from('introduction_requests')
        .insert(introduction)
        .select()
        .single()

      if (introError) throw introError

      return JSON.stringify({
        success: true,
        introduction_id: introData.id,
        member1_name: `${member1.first_name} ${member1.last_name}`,
        member2_name: `${member2.first_name} ${member2.last_name}`,
        type: input.introduction_type,
        scheduled_for: scheduledAt.toISOString(),
        message: 'Introduction request created successfully'
      })
    } catch (error) {
      return JSON.stringify({ error: `Failed to create introduction: ${error}` })
    }
  }

  private generateIntroductionMessage(member1: any, member2: any, type: string): string {
    const commonInterests = this.findCommonInterests(member1, member2)
    
    const templates = {
      MUTUAL_INTEREST: `Hi ${member1.first_name} and ${member2.first_name}! I thought you two might enjoy connecting since you both share interests in ${commonInterests.slice(0, 2).join(' and ')}. It would be wonderful to see you both get to know each other better in our church community.`,
      MINISTRY_MATCH: `${member1.first_name} and ${member2.first_name}, I'd love to introduce you both! You each have complementary skills and heart for ministry that could create some beautiful opportunities to serve together.`,
      LIFE_STAGE: `Hi ${member1.first_name} and ${member2.first_name}! You're both navigating similar life stages and I thought you might find encouragement and friendship in connecting with each other.`,
      SKILL_SHARE: `${member1.first_name} and ${member2.first_name}, I'm excited to introduce you! You both have valuable skills and experiences that could benefit each other.`,
      PASTORAL_CARE: `I wanted to connect ${member1.first_name} and ${member2.first_name} as you both might find encouragement in each other's fellowship and shared faith journey.`
    }

    return templates[type as keyof typeof templates] || templates.MUTUAL_INTEREST
  }

  private findCommonInterests(member1: any, member2: any): string[] {
    const interests1 = member1.interests || []
    const interests2 = member2.interests || []
    return interests1.filter((interest: string) => interests2.includes(interest))
  }
}

// Tool Factory
export class ChurchToolFactory {
  static createTool(toolName: string, churchId: string): ChurchTool | null {
    switch (toolName) {
      case 'member_lookup':
        return new MemberLookupTool(churchId)
      case 'communication_sender':
        return new CommunicationSenderTool(churchId)
      case 'member_matching':
        return new MemberMatchingTool(churchId)
      case 'care_scheduler':
        return new CareSchedulerTool(churchId)
      case 'event_analyzer':
        return new EventAnalyzerTool(churchId)
      case 'giving_analyzer':
        return new GivingAnalyzerTool(churchId)
      case 'introduction_creator':
        return new IntroductionCreatorTool(churchId)
      default:
        return null
    }
  }

  static getAvailableTools(): string[] {
    return [
      'member_lookup',
      'communication_sender',
      'member_matching',
      'care_scheduler',
      'event_analyzer',
      'giving_analyzer',
      'introduction_creator'
    ]
  }
}
