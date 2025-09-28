import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CRMEventPublisher } from './crm-event-publisher'
import { EngagementTracker } from './engagement-tracker'

// Types for Vocal Connect Integration
export interface ChurchVolunteer {
  id: string
  profile_id?: string
  church_id: string
  languages: string[]
  service_zip?: string
  service_radius_km: number
  max_tasks_per_week: number
  max_task_duration_min: number
  transport_modes: string[]
  interests: string[]
  risk_tier: 'R0' | 'R1' | 'R2'
  verification_status: 'pending' | 'approved' | 'rejected'
  verification_level: number
  background_check_date?: string
  notify_channels: string[]
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
  reliability_score: number
  weekly_task_quota_used: number
  quota_reset_date: string
  total_tasks_completed: number
  paused: boolean
  active: boolean
}

export interface AssistanceCase {
  id: string
  church_id: string
  profile_id?: string
  initiated_by_profile_id?: string
  case_type: string
  status: 'open' | 'pending_offer' | 'assigned' | 'in_progress' | 'delivered' | 'closed' | 'escalated'
  urgency: 'today' | 'this_week' | 'flexible'
  contact_name: string
  contact_phone: string
  contact_language: string
  window_start: string
  window_end: string
  address: string
  address_notes?: string
  geo_lat?: number
  geo_lng?: number
  items_requested: string[]
  dietary_restrictions: string[]
  payment_preference: 'donation' | 'reimburse' | 'snap' | 'free'
  special_instructions?: string
  consent_to_share: boolean
  risk_flags: string[]
  pastoral_notes?: string
  call_transcript_id?: string
  consent_audio_url?: string
  communication_log: any[]
  assigned_volunteer_id?: string
  assigned_at?: string
  completed_at?: string
  completion_notes?: string
  escalated_at?: string
  escalation_reason?: string
  escalated_to_profile_id?: string
  partner_agency?: string
}

export interface VolunteerOffer {
  id: string
  case_id: string
  volunteer_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  matching_score?: number
  offered_at: string
  expires_at: string
  responded_at?: string
  response_method?: string
  estimated_arrival?: string
  actual_arrival?: string
  drop_code?: string
  delivery_confirmed_at?: string
  completion_notes?: string
  communication_log: any[]
}

export interface CommunicationEvent {
  id: string
  church_id: string
  event_type: string
  volunteer_id?: string
  case_id?: string
  offer_id?: string
  profile_id?: string
  channel: string
  direction: 'inbound' | 'outbound'
  content?: string
  metadata: any
  status: string
  external_id?: string
  response_expected: boolean
  response_received_at?: string
  response_content?: string
}

export class VocalConnectIntegration {
  private supabase: SupabaseClient
  private eventPublisher: CRMEventPublisher
  private engagementTracker: EngagementTracker

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    eventPublisher: CRMEventPublisher,
    engagementTracker: EngagementTracker
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.eventPublisher = eventPublisher
    this.engagementTracker = engagementTracker
  }

  // Volunteer Management
  async createVolunteerFromProfile(
    profileId: string,
    churchId: string,
    volunteerData: Partial<ChurchVolunteer>
  ): Promise<ChurchVolunteer> {
    const volunteer: Partial<ChurchVolunteer> = {
      profile_id: profileId,
      church_id: churchId,
      ...volunteerData
    }

    const { data, error } = await this.supabase
      .from('church_volunteers')
      .insert(volunteer)
      .select()
      .single()

    if (error) throw error

    // Publish volunteer registration event
    await this.eventPublisher.publishMemberEvent(
      'updated',
      profileId,
      churchId,
      { 
        action: 'volunteer_registered',
        volunteer_id: data.id,
        risk_tier: data.risk_tier,
        service_radius_km: data.service_radius_km
      }
    )

    return data
  }

  async updateVolunteerAvailability(
    volunteerId: string,
    availability: {
      availability_type: 'recurring' | 'adhoc'
      days_of_week?: number[]
      start_time?: string
      end_time?: string
      start_datetime?: string
      end_datetime?: string
      timezone?: string
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('volunteer_availability')
      .insert({
        volunteer_id: volunteerId,
        ...availability
      })

    if (error) throw error

    // Get volunteer info for event
    const { data: volunteer } = await this.supabase
      .from('church_volunteers')
      .select('profile_id, church_id')
      .eq('id', volunteerId)
      .single()

    if (volunteer?.profile_id) {
      await this.eventPublisher.publishMemberEvent(
        'updated',
        volunteer.profile_id,
        volunteer.church_id,
        { 
          action: 'availability_updated',
          volunteer_id: volunteerId,
          availability_type: availability.availability_type
        }
      )
    }
  }

  // Assistance Case Management
  async createAssistanceCase(
    caseData: Partial<AssistanceCase>
  ): Promise<AssistanceCase> {
    const { data, error } = await this.supabase
      .from('member_assistance_cases')
      .insert(caseData)
      .select()
      .single()

    if (error) throw error

    // Publish case creation event
    await this.eventPublisher.publishMemberEvent(
      'created',
      data.profile_id,
      data.church_id,
      {
        caseId: data.id,
        caseType: data.case_type,
        urgency: data.urgency,
        status: data.status,
        eventType: 'assistance_case_created'
      }
    )

    // Track pastoral care engagement if member-initiated
    if (data.profile_id && data.initiated_by_profile_id) {
      // Log engagement event for analytics
      console.log('Assistance case created:', {
        caseId: data.id,
        profileId: data.profile_id,
        caseType: data.case_type,
        urgency: data.urgency,
        initiatedBy: data.initiated_by_profile_id
      })
    }

    return data
  }

  async matchVolunteersToCase(
    caseId: string,
    maxOffers: number = 3
  ): Promise<VolunteerOffer[]> {
    // Get case details
    const { data: assistanceCase, error: caseError } = await this.supabase
      .from('member_assistance_cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !assistanceCase) throw caseError

    // Find matching volunteers using spatial and preference matching
    const { data: volunteers, error: volunteerError } = await this.supabase
      .rpc('find_matching_volunteers', {
        p_case_id: caseId,
        p_church_id: assistanceCase.church_id,
        p_max_results: maxOffers * 2 // Get extra for filtering
      })

    if (volunteerError) throw volunteerError

    // Create volunteer offers
    const offers: VolunteerOffer[] = []
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2) // 2-hour expiration

    for (const volunteer of volunteers.slice(0, maxOffers)) {
      const offer: Partial<VolunteerOffer> = {
        case_id: caseId,
        volunteer_id: volunteer.id,
        matching_score: volunteer.matching_score,
        expires_at: expiresAt.toISOString()
      }

      const { data, error } = await this.supabase
        .from('volunteer_offers')
        .insert(offer)
        .select()
        .single()

      if (!error) {
        offers.push(data)

        // Send notification to volunteer
        await this.sendVolunteerNotification(volunteer.id, caseId, data.id)
      }
    }

    // Publish matching event
    await this.eventPublisher.publishMemberEvent(
      'updated',
      assistanceCase.profile_id,
      assistanceCase.church_id,
      {
        caseId,
        matchedVolunteers: offers.length,
        offers: offers.map(o => ({
          offerId: o.id,
          volunteerId: o.volunteer_id,
          matchingScore: o.matching_score
        })),
        eventType: 'volunteers_matched'
      }
    )

    return offers
  }

  async respondToOffer(
    offerId: string,
    response: 'accepted' | 'declined',
    responseMethod: string = 'app',
    notes?: string
  ): Promise<void> {
    const { data: offer, error: offerError } = await this.supabase
      .from('volunteer_offers')
      .update({
        status: response,
        responded_at: new Date().toISOString(),
        response_method: responseMethod,
        completion_notes: notes
      })
      .eq('id', offerId)
      .select(`
        *,
        case:member_assistance_cases(*),
        volunteer:church_volunteers(*)
      `)
      .single()

    if (offerError) throw offerError

    // If accepted, assign volunteer to case
    if (response === 'accepted') {
      await this.supabase
        .from('member_assistance_cases')
        .update({
          status: 'assigned',
          assigned_volunteer_id: offer.volunteer_id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', offer.case_id)

      // Decline other pending offers for this case
      await this.supabase
        .from('volunteer_offers')
        .update({ status: 'declined' })
        .eq('case_id', offer.case_id)
        .neq('id', offerId)
        .eq('status', 'pending')
    }

    // Publish response event
    await this.eventPublisher.publishMemberEvent(
      'updated',
      offer.volunteer_id,
      offer.church_id,
      {
        offerId,
        caseId: offer.case_id,
        response,
        responseMethod,
        notes,
        eventType: `offer_${response}`
      }
    )

    // Track volunteer engagement
    if (offer.volunteer.profile_id) {
      // Log volunteer activity for analytics
      console.log('Volunteer offer response:', {
        offerId,
        volunteerId: offer.volunteer.profile_id,
        caseId: offer.case_id,
        response,
        responseMethod
      })
    }
  }

  async completeAssistanceCase(
    caseId: string,
    completionNotes?: string,
    actualArrival?: string,
    dropCode?: string
  ): Promise<void> {
    const { data: assistanceCase, error } = await this.supabase
      .from('member_assistance_cases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes
      })
      .eq('id', caseId)
      .select('*, volunteer:church_volunteers(*)')
      .single()

    if (error) throw error

    // Update volunteer offer
    if (assistanceCase.assigned_volunteer_id) {
      await this.supabase
        .from('volunteer_offers')
        .update({
          status: 'accepted', // Ensure it's marked as accepted
          actual_arrival: actualArrival,
          drop_code: dropCode,
          delivery_confirmed_at: new Date().toISOString(),
          completion_notes: completionNotes
        })
        .eq('case_id', caseId)
        .eq('volunteer_id', assistanceCase.assigned_volunteer_id)

      // Update volunteer stats
      await this.supabase
        .rpc('update_volunteer_completion_stats', {
          p_volunteer_id: assistanceCase.assigned_volunteer_id
        })
    }

    // Publish completion event
    await this.eventPublisher.publishMemberEvent(
      'updated',
      assistanceCase.profile_id,
      assistanceCase.church_id,
      {
        caseId,
        completionNotes,
        actualArrival,
        dropCode,
        completedAt: new Date().toISOString(),
        eventType: 'case_completed'
      }
    )

    // Track member engagement (assistance received)
    if (assistanceCase.profile_id) {
      // Log assistance completion for analytics
      console.log('Assistance case completed:', {
        caseId,
        profileId: assistanceCase.profile_id,
        caseType: assistanceCase.case_type,
        completionNotes
      })
    }
  }

  // Communication Management
  async sendVolunteerNotification(
    volunteerId: string,
    caseId: string,
    offerId: string
  ): Promise<void> {
    // Get volunteer and case details
    const { data: volunteer } = await this.supabase
      .from('church_volunteers')
      .select('*, profile:profiles(*)')
      .eq('id', volunteerId)
      .single()

    const { data: assistanceCase } = await this.supabase
      .from('member_assistance_cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (!volunteer || !assistanceCase) return

    // Determine preferred notification channel
    const preferredChannel = volunteer.notify_channels[0] || 'sms'
    const phone = volunteer.profile?.phone
    const email = volunteer.profile?.email

    let content = `New assistance request: ${assistanceCase.case_type} for ${assistanceCase.contact_name}. `
    content += `Location: ${assistanceCase.address}. `
    content += `Needed by: ${new Date(assistanceCase.window_end).toLocaleDateString()}. `
    content += `Reply YES to accept or NO to decline.`

    // Log communication event
    await this.supabase
      .from('volunteer_communication_events')
      .insert({
        church_id: volunteer.church_id,
        event_type: 'volunteer_offer_sent',
        volunteer_id: volunteerId,
        case_id: caseId,
        offer_id: offerId,
        channel: preferredChannel,
        direction: 'outbound',
        content: content,
        response_expected: true,
        metadata: {
          phone: phone,
          email: email,
          urgency: assistanceCase.urgency
        }
      })

    // Here you would integrate with actual SMS/email services
    // For now, we'll just publish an event for external handlers
    await this.eventPublisher.publishCommunicationEvent(
      'sent',
      offerId,
      volunteer.church_id,
      {
        channel: preferredChannel,
        recipient_type: 'volunteer',
        recipient_id: volunteerId,
        phone: phone,
        email: email,
        content: content,
        case_id: caseId
      }
    )
  }

  async logCommunicationEvent(
    eventData: Partial<CommunicationEvent>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('volunteer_communication_events')
      .insert(eventData)

    if (error) throw error

    // Publish to event bus for analytics
    await this.eventPublisher.publishCommunicationEvent(
      'sent',
      eventData.external_id || 'unknown',
      eventData.church_id!,
      {
        channel: eventData.channel,
        direction: eventData.direction,
        volunteer_id: eventData.volunteer_id,
        case_id: eventData.case_id,
        status: eventData.status
      }
    )
  }

  // Analytics and Reporting
  async getVolunteerStats(churchId: string): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_volunteer_analytics', { p_church_id: churchId })

    if (error) throw error
    return data
  }

  async getCaseMetrics(churchId: string, startDate?: string, endDate?: string): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_case_metrics', {
        p_church_id: churchId,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (error) throw error
    return data
  }
}
