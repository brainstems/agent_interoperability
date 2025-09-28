import { createClient } from '@/lib/supabase'
import { churchEventMonitor, MonitoringResult } from './event-monitoring'
import { crewaiService } from './crewai-service'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient>

export interface WorkflowExecution {
  id: string
  triggerId: string
  agentName: string
  memberId: string
  churchId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  scheduledAt: Date
  executedAt?: Date
  result?: any
  error?: string
  metadata: Record<string, any>
}

export class AutomatedWorkflowEngine {
  private supabase: SupabaseClient
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  constructor() {
    this.supabase = createClient()
  }

  async startMonitoring(churchId: string, intervalMinutes = 15) {
    if (this.isRunning) {
      console.log('Workflow monitoring already running')
      return
    }

    this.isRunning = true
    console.log(`Starting automated workflow monitoring for church ${churchId}`)

    // Run initial scan
    await this.runMonitoringCycle(churchId)

    // Set up recurring monitoring
    this.intervalId = setInterval(async () => {
      try {
        await this.runMonitoringCycle(churchId)
      } catch (error) {
        console.error('Error in monitoring cycle:', error)
      }
    }, intervalMinutes * 60 * 1000)
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('Stopped automated workflow monitoring')
  }

  private async runMonitoringCycle(churchId: string) {
    console.log(`Running monitoring cycle for church ${churchId}`)

    try {
      // Get all monitoring results
      const monitoringResults = await churchEventMonitor.monitorAllMembers(churchId)
      
      if (monitoringResults.length === 0) {
        console.log('No triggers detected in this cycle')
        return
      }

      console.log(`Detected ${monitoringResults.length} triggers`)

      // Process each triggered event
      for (const result of monitoringResults) {
        await this.processTriggeredEvent(result, churchId)
      }

      // Execute pending workflows
      await this.executePendingWorkflows(churchId)

    } catch (error) {
      console.error('Error in monitoring cycle:', error)
    }
  }

  private async processTriggeredEvent(result: MonitoringResult, churchId: string) {
    if (!result.triggered || !result.agentName || !result.memberId) return

    try {
      // Check if this trigger has already been processed recently
      const existingWorkflow = await this.findRecentWorkflow(
        result.agentName,
        result.memberId,
        churchId
      )

      if (existingWorkflow) {
        console.log(`Skipping duplicate trigger for ${result.agentName} - ${result.memberId}`)
        return
      }

      // Create workflow execution record
      const workflowExecution: Partial<WorkflowExecution> = {
        triggerId: `${result.agentName}_${result.memberId}_${Date.now()}`,
        agentName: result.agentName,
        memberId: result.memberId,
        churchId,
        status: 'pending',
        priority: result.priority || 'medium',
        scheduledAt: new Date(),
        metadata: result.metadata || {}
      }

      // Store workflow execution
      const { data: execution, error } = await this.supabase
        .from('crewai_executions')
        .insert({
          church_id: churchId,
          agent_name: result.agentName,
          task_description: `Automated trigger: ${result.metadata?.description || 'Unknown trigger'}`,
          status: 'pending',
          priority: result.priority || 'medium',
          metadata: {
            ...result.metadata,
            memberId: result.memberId,
            triggerId: workflowExecution.triggerId,
            automated: true
          },
          created_by: 'system'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow execution:', error)
        return
      }

      console.log(`Created workflow execution for ${result.agentName} - member ${result.memberId}`)

    } catch (error) {
      console.error('Error processing triggered event:', error)
    }
  }

  private async findRecentWorkflow(
    agentName: string, 
    memberId: string, 
    churchId: string
  ): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const { data } = await this.supabase
      .from('crewai_executions')
      .select('id')
      .eq('church_id', churchId)
      .eq('agent_name', agentName)
      .eq('metadata->memberId', memberId)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1)

    return Boolean(data && data.length > 0)
  }

  private async executePendingWorkflows(churchId: string) {
    // Get pending workflows ordered by priority and creation time
    const { data: pendingWorkflows } = await this.supabase
      .from('crewai_executions')
      .select('*')
      .eq('church_id', churchId)
      .eq('status', 'pending')
      .order('priority', { ascending: false }) // high priority first
      .order('created_at', { ascending: true })
      .limit(10) // Process max 10 per cycle to avoid overload

    if (!pendingWorkflows || pendingWorkflows.length === 0) {
      return
    }

    console.log(`Executing ${pendingWorkflows.length} pending workflows`)

    for (const workflow of pendingWorkflows) {
      await this.executeWorkflow(workflow)
    }
  }

  private async executeWorkflow(workflow: any) {
    try {
      // Update status to running
      await this.supabase
        .from('crewai_executions')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', workflow.id)

      // Determine the appropriate workflow based on agent name
      const result = await this.routeToAgentWorkflow(workflow)

      // Update with success
      await this.supabase
        .from('crewai_executions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: result
        })
        .eq('id', workflow.id)

      console.log(`Successfully executed workflow ${workflow.id} for agent ${workflow.agent_name}`)

    } catch (error) {
      console.error(`Error executing workflow ${workflow.id}:`, error)

      // Update with error
      await this.supabase
        .from('crewai_executions')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', workflow.id)
    }
  }

  private async routeToAgentWorkflow(workflow: any): Promise<any> {
    const { agent_name, metadata, church_id } = workflow
    const memberId = metadata?.memberId

    // Get member information for context
    const { data: member } = await this.supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (!member) {
      throw new Error(`Member ${memberId} not found`)
    }

    // Route to appropriate workflow based on agent type
    switch (agent_name) {
      // Member Retention & Engagement
      case 'inactivity_alert_agent':
        return await this.executeInactivityAlert(member, workflow)
      
      case 'milestone_celebration_agent':
        return await this.executeMilestoneCelebration(member, workflow)
      
      case 'volunteer_dropout_detector':
        return await this.executeVolunteerDropoutResponse(member, workflow)
      
      case 'newcomer_onboarding_agent':
        return await this.executeNewcomerOnboarding(member, workflow)
      
      case 'at_risk_member_identifier':
        return await this.executeAtRiskMemberCare(member, workflow)
      
      case 'life_event_tracker_agent':
        return await this.executeLifeEventResponse(member, workflow)

      // Donation & Stewardship
      case 'lapsed_donor_reengagement_agent':
        return await this.executeLapsedDonorReengagement(member, workflow)
      
      case 'first_time_donor_journey_agent':
        return await this.executeFirstTimeDonorJourney(member, workflow)
      
      case 'major_gift_risk_alert_agent':
        return await this.executeMajorGiftRiskAlert(member, workflow)

      // Worship & Attendance
      case 'recurring_absence_monitor_agent':
        return await this.executeRecurringAbsenceFollowUp(member, workflow)
      
      case 'seasonal_attendance_pattern_agent':
        return await this.executeSeasonalEngagement(member, workflow)

      // Communications & Digital Engagement
      case 'email_dropoff_detector_agent':
        return await this.executeEmailReengagement(member, workflow)

      default:
        // Generic agent execution
        return await crewaiService.executeAgent(
          agent_name,
          `Process automated trigger for member ${member.first_name} ${member.last_name}`,
          church_id,
          { member_id: memberId, ...metadata },
          'system'
        )
    }
  }

  // Specific workflow implementations
  private async executeInactivityAlert(member: any, workflow: any): Promise<any> {
    const task = `Member ${member.first_name} ${member.last_name} has been absent from worship and church activities for 4+ weeks. Please:
    1. Review their recent attendance and engagement patterns
    2. Send a caring check-in message expressing that they've been missed
    3. Offer pastoral support if needed
    4. Suggest gentle re-engagement opportunities
    5. Schedule a pastoral care follow-up if appropriate`

    return await crewaiService.executeAgent(
      'inactivity_alert_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        member_email: member.email,
        member_phone: member.phone
      },
      'system'
    )
  }

  private async executeMilestoneCelebration(member: any, workflow: any): Promise<any> {
    const eventType = workflow.metadata?.eventType || 'milestone'
    
    const task = `Member ${member.first_name} ${member.last_name} has a ${eventType} to celebrate. Please:
    1. Send a personalized congratulatory message
    2. Consider appropriate recognition (social media, newsletter, announcement)
    3. Suggest ways the church community can celebrate with them
    4. Update their member record with this milestone
    5. Look for opportunities to deepen their engagement through this celebration`

    return await crewaiService.executeAgent(
      'milestone_celebration_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        event_type: eventType,
        celebration_date: new Date().toISOString()
      },
      'system'
    )
  }

  private async executeVolunteerDropoutResponse(member: any, workflow: any): Promise<any> {
    const task = `Volunteer ${member.first_name} ${member.last_name} has missed multiple scheduled volunteer commitments. Please:
    1. Reach out with care and concern (not accusation)
    2. Ask if they're experiencing any challenges or need support
    3. Assess if their volunteer role is still a good fit
    4. Offer alternative ways to serve if needed
    5. Schedule pastoral care if personal issues are indicated
    6. Express appreciation for their past service`

    return await crewaiService.executeAgent(
      'volunteer_dropout_detector',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        volunteer_roles: workflow.metadata?.volunteerRoles || []
      },
      'system'
    )
  }

  private async executeNewcomerOnboarding(member: any, workflow: any): Promise<any> {
    const task = `New visitor ${member.first_name} ${member.last_name} has recently attended or expressed interest. Please:
    1. Send a warm welcome message within 24 hours
    2. Provide information about the church's mission and values
    3. Invite them to upcoming newcomer events or classes
    4. Suggest ways to get connected (small groups, volunteer opportunities)
    5. Schedule a pastoral meet-and-greet if they're interested
    6. Add them to appropriate newcomer communication sequences`

    return await crewaiService.executeAgent(
      'newcomer_onboarding_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        first_visit_date: member.created_at,
        contact_preferences: workflow.metadata?.contactPreferences
      },
      'system'
    )
  }

  private async executeAtRiskMemberCare(member: any, workflow: any): Promise<any> {
    const task = `Member ${member.first_name} ${member.last_name} is showing signs of disengagement (declining attendance/giving). Please:
    1. Flag for immediate pastoral attention
    2. Review recent life events or changes that might explain the decline
    3. Reach out with genuine care and concern
    4. Listen for underlying issues (spiritual, personal, relational)
    5. Offer appropriate support and resources
    6. Create a re-engagement plan tailored to their needs and interests`

    return await crewaiService.executeAgent(
      'at_risk_member_identifier',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        risk_factors: workflow.metadata?.riskFactors || [],
        decline_patterns: workflow.metadata?.declinePatterns
      },
      'system'
    )
  }

  private async executeLifeEventResponse(member: any, workflow: any): Promise<any> {
    const eventType = workflow.metadata?.eventType || 'life event'
    
    const task = `Member ${member.first_name} ${member.last_name} has experienced a significant life event (${eventType}). Please:
    1. Provide immediate pastoral care and support
    2. Update their member record with this life event
    3. Coordinate appropriate church response (meals, visits, prayers)
    4. Connect them with relevant support groups or resources
    5. Schedule follow-up care as appropriate
    6. Inform relevant ministry leaders who should be aware`

    return await crewaiService.executeAgent(
      'life_event_tracker_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        life_event: eventType,
        event_date: new Date().toISOString(),
        support_needed: workflow.metadata?.supportNeeded
      },
      'system'
    )
  }

  private async executeLapsedDonorReengagement(member: any, workflow: any): Promise<any> {
    const task = `Donor ${member.first_name} ${member.last_name} hasn't given in 3+ months after being a regular giver. Please:
    1. Send a gratitude message for their past generosity
    2. Share recent impact stories showing how previous gifts made a difference
    3. Gently inquire about their well-being (not their giving)
    4. Offer pastoral support if they're experiencing financial difficulties
    5. Provide easy ways to re-engage with giving when they're ready
    6. Focus on relationship, not financial need`

    return await crewaiService.executeAgent(
      'lapsed_donor_reengagement_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        last_gift_date: workflow.metadata?.lastGiftDate,
        previous_giving_pattern: workflow.metadata?.givingPattern
      },
      'system'
    )
  }

  private async executeFirstTimeDonorJourney(member: any, workflow: any): Promise<any> {
    const task = `${member.first_name} ${member.last_name} has made their first gift to the church! Please:
    1. Send a heartfelt thank-you message within 24 hours
    2. Share a specific story of how gifts like theirs make a difference
    3. Explain how the church handles donations responsibly
    4. Provide information about ongoing giving opportunities
    5. Invite them to learn more about the church's mission and impact
    6. Add them to appropriate stewardship communication sequences`

    return await crewaiService.executeAgent(
      'first_time_donor_journey_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        first_gift_amount: workflow.metadata?.giftAmount,
        gift_date: workflow.metadata?.giftDate
      },
      'system'
    )
  }

  private async executeMajorGiftRiskAlert(member: any, workflow: any): Promise<any> {
    const task = `Major donor ${member.first_name} ${member.last_name} has missed their expected monthly gift. Please:
    1. Alert the pastoral and development team immediately
    2. Review their recent engagement and any life changes
    3. Schedule a personal check-in (pastoral, not financial)
    4. Ensure they feel valued and connected beyond their giving
    5. Address any concerns or issues they might have
    6. Provide appropriate pastoral care and support`

    return await crewaiService.executeAgent(
      'major_gift_risk_alert_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        typical_gift_amount: workflow.metadata?.typicalAmount,
        missed_months: workflow.metadata?.missedMonths
      },
      'system'
    )
  }

  private async executeRecurringAbsenceFollowUp(member: any, workflow: any): Promise<any> {
    const task = `Regular attender ${member.first_name} ${member.last_name} has missed 3+ Sunday worship services. Please:
    1. Send a gentle "we miss you" message
    2. Ask if everything is okay and if they need support
    3. Share what they've missed (highlights, not guilt)
    4. Invite them to upcoming special events or services
    5. Offer alternative ways to stay connected if attendance is difficult
    6. Schedule pastoral follow-up if needed`

    return await crewaiService.executeAgent(
      'recurring_absence_monitor_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        missed_sundays: workflow.metadata?.missedCount,
        last_attendance: workflow.metadata?.lastAttendance
      },
      'system'
    )
  }

  private async executeSeasonalEngagement(member: any, workflow: any): Promise<any> {
    const task = `During seasonal attendance decline, help maintain connection with members like ${member.first_name} ${member.last_name}. Please:
    1. Send seasonal engagement resources (summer devotionals, holiday materials)
    2. Promote digital worship options and online community
    3. Suggest family-friendly activities that maintain church connection
    4. Share upcoming events designed for seasonal schedules
    5. Provide ways to stay involved even with irregular attendance
    6. Maintain warm communication without pressure`

    return await crewaiService.executeAgent(
      'seasonal_attendance_pattern_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        season: workflow.metadata?.season,
        attendance_pattern: workflow.metadata?.attendancePattern
      },
      'system'
    )
  }

  private async executeEmailReengagement(member: any, workflow: any): Promise<any> {
    const task = `Member ${member.first_name} ${member.last_name} has stopped opening church emails. Please:
    1. Test different subject lines and send times
    2. Offer alternative communication preferences (text, phone, mail)
    3. Send a simplified, high-value message to test engagement
    4. Ask about their communication preferences directly
    5. Ensure they're still interested in receiving updates
    6. Respect their preferences while maintaining connection`

    return await crewaiService.executeAgent(
      'email_dropoff_detector_agent',
      task,
      workflow.church_id,
      { 
        member_id: member.id,
        member_name: `${member.first_name} ${member.last_name}`,
        email_engagement_history: workflow.metadata?.engagementHistory,
        preferred_topics: workflow.metadata?.preferredTopics
      },
      'system'
    )
  }

  // Manual trigger methods for testing and special cases
  async triggerWorkflowForMember(
    agentName: string,
    memberId: string,
    churchId: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const { data: execution, error } = await this.supabase
      .from('crewai_executions')
      .insert({
        church_id: churchId,
        agent_name: agentName,
        task_description: `Manual trigger for ${agentName}`,
        status: 'pending',
        priority: 'high',
        metadata: {
          ...metadata,
          memberId,
          manual_trigger: true
        },
        created_by: 'manual'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create manual workflow: ${error.message}`)
    }

    return execution.id
  }

  async getWorkflowStatus(executionId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('crewai_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error) {
      throw new Error(`Failed to get workflow status: ${error.message}`)
    }

    return data
  }

  async getWorkflowHistory(
    churchId: string,
    agentName?: string,
    memberId?: string,
    limit = 50
  ): Promise<any[]> {
    let query = this.supabase
      .from('crewai_executions')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (agentName) {
      query = query.eq('agent_name', agentName)
    }

    if (memberId) {
      query = query.eq('metadata->memberId', memberId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get workflow history: ${error.message}`)
    }

    return data || []
  }
}

export const automatedWorkflowEngine = new AutomatedWorkflowEngine()
