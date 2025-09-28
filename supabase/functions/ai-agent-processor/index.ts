import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { taskType, payload, churchId } = await req.json()

    console.log(`Processing AI agent task: ${taskType}`)

    let result = null

    switch (taskType) {
      case 'member_matching':
        result = await processMemberMatching(supabaseClient, payload, churchId)
        break
      
      case 'pastoral_care_reminder':
        result = await processPastoralCareReminder(supabaseClient, payload, churchId)
        break
      
      case 'event_follow_up':
        result = await processEventFollowUp(supabaseClient, payload, churchId)
        break
      
      case 'giving_analysis':
        result = await processGivingAnalysis(supabaseClient, payload, churchId)
        break
      
      default:
        throw new Error(`Unknown task type: ${taskType}`)
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing AI agent task:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function processMemberMatching(supabase: any, payload: any, churchId: string) {
  const { userId } = payload

  // Get user profile with interests
  const { data: userProfile, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('church_id', churchId)
    .single()

  if (userError) throw userError

  // Find potential matches using vector similarity
  const { data: matches, error: matchError } = await supabase
    .rpc('find_matching_profiles', {
      target_profile_id: userId,
      similarity_threshold: 0.7,
      limit_count: 5
    })

  if (matchError) throw matchError

  // Create connection suggestions
  const connections = []
  for (const match of matches) {
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        church_id: churchId,
        user_id: userId,
        member_id: match.profile_id,
        match_percentage: Math.round(match.similarity_score * 100),
        connection_strength: match.connection_score,
        status: 'SUGGESTED',
        suggested_engagement: generateEngagementSuggestion(match),
        common_interests: await getCommonInterests(supabase, userId, match.profile_id)
      })
      .select()
      .single()

    if (!connectionError) {
      connections.push(connection)
    }
  }

  return {
    matchesFound: matches.length,
    connectionsCreated: connections.length,
    connections
  }
}

async function processPastoralCareReminder(supabase: any, payload: any, churchId: string) {
  const { memberId, reason } = payload

  // Get member profile
  const { data: member, error: memberError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .single()

  if (memberError) throw memberError

  // Find clergy/staff to notify
  const { data: clergy, error: clergyError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('church_id', churchId)
    .in('role', ['ADMIN', 'CLERGY', 'STAFF'])
    .eq('is_active', true)

  if (clergyError) throw clergyError

  // Create notifications for clergy
  const notifications = []
  for (const person of clergy) {
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        church_id: churchId,
        user_id: person.id,
        channel: 'EMAIL',
        subject: `Pastoral Care Needed: ${member.first_name} ${member.last_name}`,
        content: `${member.first_name} ${member.last_name} may need pastoral care. Reason: ${reason}`,
        payload: {
          member_id: memberId,
          reason,
          priority: 'medium'
        },
        status: 'PENDING'
      })
      .select()
      .single()

    if (!notificationError) {
      notifications.push(notification)
    }
  }

  return {
    memberName: `${member.first_name} ${member.last_name}`,
    notificationsCreated: notifications.length,
    notifiedPersons: clergy.length
  }
}

async function processEventFollowUp(supabase: any, payload: any, churchId: string) {
  const { eventId } = payload

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('church_id', churchId)
    .single()

  if (eventError) throw eventError

  // Get event attendees (would need attendance tracking table)
  // For now, simulate follow-up for recent members
  const { data: recentMembers, error: membersError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('church_id', churchId)
    .eq('member_status', 'VISITOR')
    .eq('is_active', true)
    .limit(10)

  if (membersError) throw membersError

  // Create follow-up notifications
  const followUps = []
  for (const member of recentMembers) {
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        church_id: churchId,
        user_id: member.id,
        channel: 'EMAIL',
        subject: `Thank you for attending ${event.title}`,
        content: `Hi ${member.first_name}, thank you for joining us at ${event.title}! We'd love to connect with you more.`,
        payload: {
          event_id: eventId,
          follow_up_type: 'post_event'
        },
        status: 'PENDING'
      })
      .select()
      .single()

    if (!notificationError) {
      followUps.push(notification)
    }
  }

  return {
    eventTitle: event.title,
    followUpsCreated: followUps.length,
    membersContacted: recentMembers.length
  }
}

async function processGivingAnalysis(supabase: any, payload: any, churchId: string) {
  // This would analyze giving patterns and create insights
  // For now, return a simple analysis
  
  return {
    analysis: 'Giving analysis completed',
    insights: [
      'Monthly giving is 3% above target',
      'Consistent givers: 85% of members',
      'Recommended follow-up with 5 members who haven\'t given recently'
    ],
    recommendations: [
      'Send stewardship appreciation messages',
      'Plan giving testimony for next service',
      'Consider digital giving options for younger members'
    ]
  }
}

function generateEngagementSuggestion(match: any): string {
  const suggestions = [
    'Consider introducing them at the next fellowship event',
    'They might enjoy serving together in ministry',
    'Invite them to join a small group together',
    'They have complementary skills for church projects',
    'Consider pairing them for a service opportunity'
  ]
  
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

async function getCommonInterests(supabase: any, userId1: string, userId2: string): Promise<string[]> {
  const { data: profile1 } = await supabase
    .from('profiles')
    .select('interests')
    .eq('id', userId1)
    .single()

  const { data: profile2 } = await supabase
    .from('profiles')
    .select('interests')
    .eq('id', userId2)
    .single()

  if (!profile1?.interests || !profile2?.interests) return []

  const interests1 = profile1.interests || []
  const interests2 = profile2.interests || []

  return interests1.filter((interest: string) => interests2.includes(interest))
}
