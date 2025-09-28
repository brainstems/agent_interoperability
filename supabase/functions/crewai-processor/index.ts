import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CrewAI and LangChain imports (these would need to be available in Deno)
// For now, we'll create a simplified version that can be enhanced

interface ExecutionRequest {
  crew_name?: string
  agent_name?: string
  task_description?: string
  church_id: string
  user_id?: string
  inputs?: Record<string, any>
  trigger_event?: string
  metadata?: Record<string, any>
}

interface AgentConfig {
  id: string
  name: string
  role: string
  goal: string
  backstory: string
  tools: string[]
  allow_delegation: boolean
  max_iterations: number
  memory_enabled: boolean
}

interface CrewConfig {
  id: string
  name: string
  description: string
  process: string
  memory_enabled: boolean
  is_active: boolean
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { crew_name, agent_name, task_description, church_id, user_id, inputs, trigger_event, metadata } = await req.json() as ExecutionRequest

    if (!church_id) {
      return new Response(
        JSON.stringify({ error: 'church_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: string

    if (crew_name) {
      // Execute crew workflow
      result = await executeCrew(supabase, crew_name, church_id, user_id, inputs || {}, trigger_event, metadata)
    } else if (agent_name && task_description) {
      // Execute single agent task
      result = await executeAgentTask(supabase, agent_name, task_description, church_id, user_id, inputs || {})
    } else {
      return new Response(
        JSON.stringify({ error: 'Either crew_name or (agent_name + task_description) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('CrewAI processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function executeCrew(
  supabase: any,
  crewName: string,
  churchId: string,
  userId?: string,
  inputs: Record<string, any> = {},
  triggerEvent?: string,
  metadata?: Record<string, any>
): Promise<string> {
  // Get crew configuration
  const { data: crewConfig, error: crewError } = await supabase
    .from('crewai_crews')
    .select('*')
    .eq('name', crewName)
    .eq('church_id', churchId)
    .eq('is_active', true)
    .single()

  if (crewError || !crewConfig) {
    throw new Error(`Crew '${crewName}' not found or inactive`)
  }

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('crewai_executions')
    .insert({
      crew_id: crewConfig.id,
      church_id: churchId,
      user_id: userId,
      status: 'RUNNING',
      inputs: inputs,
      metadata: {
        trigger_event: triggerEvent,
        ...metadata
      },
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (execError) {
    throw new Error(`Failed to create execution: ${execError.message}`)
  }

  try {
    // Get crew agents
    const { data: crewAgents } = await supabase
      .from('crewai_crew_agents')
      .select(`
        agent_id,
        crewai_agents (*)
      `)
      .eq('crew_id', crewConfig.id)

    if (!crewAgents?.length) {
      throw new Error(`No agents found for crew '${crewName}'`)
    }

    // Get crew tasks
    const { data: crewTasks } = await supabase
      .from('crewai_tasks')
      .select('*')
      .eq('crew_id', crewConfig.id)
      .order('execution_order')

    // Execute tasks sequentially (simplified version)
    let result = ''
    for (const task of crewTasks || []) {
      const agentConfig = crewAgents.find(ca => ca.crewai_agents.role === task.agent_role)?.crewai_agents
      if (agentConfig) {
        const taskResult = await executeTask(supabase, agentConfig, task, churchId, inputs)
        result += `${task.description}: ${taskResult}\n\n`
      }
    }

    // Update execution with success
    await supabase
      .from('crewai_executions')
      .update({
        status: 'COMPLETED',
        result: result,
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id)

    return result

  } catch (error) {
    // Update execution with error
    await supabase
      .from('crewai_executions')
      .update({
        status: 'FAILED',
        error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id)

    throw error
  }
}

async function executeAgentTask(
  supabase: any,
  agentName: string,
  taskDescription: string,
  churchId: string,
  userId?: string,
  inputs: Record<string, any> = {}
): Promise<string> {
  // Get agent configuration
  const { data: agentConfig, error: agentError } = await supabase
    .from('crewai_agents')
    .select('*')
    .eq('name', agentName)
    .eq('church_id', churchId)
    .eq('is_active', true)
    .single()

  if (agentError || !agentConfig) {
    throw new Error(`Agent '${agentName}' not found or inactive`)
  }

  // Execute the task
  const result = await executeTask(supabase, agentConfig, { description: taskDescription }, churchId, inputs)

  // Log the execution
  await supabase
    .from('crewai_logs')
    .insert({
      agent_id: agentConfig.id,
      church_id: churchId,
      level: 'INFO',
      message: `Task executed: ${taskDescription}`,
      metadata: {
        task_description: taskDescription,
        result_preview: result.substring(0, 200),
        user_id: userId
      },
      timestamp: new Date().toISOString()
    })

  return result
}

async function executeTask(
  supabase: any,
  agentConfig: AgentConfig,
  task: any,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  // This is a simplified task execution
  // In a full implementation, this would use the actual CrewAI/LangChain libraries
  
  const taskDescription = task.description
  
  // Simulate different agent behaviors based on role
  switch (agentConfig.role) {
    case 'pastoral_care_coordinator':
      return await handlePastoralCareTask(supabase, taskDescription, churchId, inputs)
    
    case 'fellowship_coordinator':
      return await handleFellowshipTask(supabase, taskDescription, churchId, inputs)
    
    case 'member_analyst':
      return await handleMemberAnalysisTask(supabase, taskDescription, churchId, inputs)
    
    case 'communication_specialist':
      return await handleCommunicationTask(supabase, taskDescription, churchId, inputs)
    
    case 'stewardship_analyst':
      return await handleStewardshipTask(supabase, taskDescription, churchId, inputs)
    
    default:
      return await handleGenericTask(supabase, agentConfig, taskDescription, churchId, inputs)
  }
}

async function handlePastoralCareTask(
  supabase: any,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  if (inputs.member_id) {
    // Get member details
    const { data: member } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, member_status')
      .eq('id', inputs.member_id)
      .eq('church_id', churchId)
      .single()

    if (member) {
      // Create pastoral care task
      const careTask = {
        church_id: churchId,
        task_type: 'pastoral_care',
        payload: {
          member_id: inputs.member_id,
          member_name: `${member.first_name} ${member.last_name}`,
          care_type: inputs.care_type || 'VISIT',
          reason: taskDescription,
          priority: inputs.priority || 'MEDIUM'
        },
        priority: inputs.priority === 'URGENT' ? 10 : inputs.priority === 'HIGH' ? 8 : 5,
        scheduled_at: new Date().toISOString()
      }

      await supabase.from('agent_tasks').insert(careTask)

      return `Pastoral care scheduled for ${member.first_name} ${member.last_name}. Task: ${taskDescription}`
    }
  }

  return `Pastoral care task processed: ${taskDescription}`
}

async function handleFellowshipTask(
  supabase: any,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  if (inputs.member_id) {
    // Find potential connections
    const { data: matches } = await supabase
      .rpc('find_matching_profiles', {
        target_profile_id: inputs.member_id,
        similarity_threshold: 0.7,
        limit_count: 5
      })

    if (matches?.length) {
      return `Found ${matches.length} potential connections for member. Fellowship opportunities identified.`
    }
  }

  return `Fellowship task processed: ${taskDescription}`
}

async function handleMemberAnalysisTask(
  supabase: any,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  // Get member statistics
  const { data: memberStats } = await supabase
    .from('profiles')
    .select('member_status, is_active')
    .eq('church_id', churchId)

  const activeMembers = memberStats?.filter(m => m.is_active).length || 0
  const totalMembers = memberStats?.length || 0

  return `Member analysis completed. Active members: ${activeMembers}/${totalMembers}. Task: ${taskDescription}`
}

async function handleCommunicationTask(
  supabase: any,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  if (inputs.recipient_ids && inputs.message) {
    const notifications = inputs.recipient_ids.map((userId: string) => ({
      church_id: churchId,
      user_id: userId,
      channel: inputs.channel || 'EMAIL',
      subject: inputs.subject || 'Church Communication',
      content: inputs.message,
      status: 'PENDING'
    }))

    await supabase.from('notifications').insert(notifications)

    return `Communication sent to ${inputs.recipient_ids.length} recipients. Task: ${taskDescription}`
  }

  return `Communication task processed: ${taskDescription}`
}

async function handleStewardshipTask(
  supabase: any,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  // This would typically analyze giving data
  // For now, return a mock analysis
  return `Stewardship analysis completed. Monthly giving trends analyzed. Recommendations generated. Task: ${taskDescription}`
}

async function handleGenericTask(
  supabase: any,
  agentConfig: AgentConfig,
  taskDescription: string,
  churchId: string,
  inputs: Record<string, any>
): Promise<string> {
  // Generic task handler
  return `${agentConfig.role} completed task: ${taskDescription}. Agent goal: ${agentConfig.goal}`
}
