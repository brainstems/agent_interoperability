const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateAgentTestData() {
  console.log('Populating agent test data...');
  
  const testChurchId = 'test-church-001';
  
  try {
    // Create test church
    const { error: churchError } = await supabase
      .from('churches')
      .upsert({
        id: testChurchId,
        name: 'Test Church for Agents',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      });

    if (churchError && !churchError.message.includes('duplicate key')) {
      console.error('Error creating test church:', churchError);
      return false;
    }

    // Create specialized agents
    const specializedAgents = [
      {
        id: 'agent-001',
        name: 'inactivity_alert_agent',
        role: 'Member Engagement Specialist',
        goal: 'Monitor member activity and send alerts for inactive members',
        backstory: 'Specialized in tracking member engagement patterns',
        tools: ['member_lookup_tool', 'email_sender_tool', 'activity_tracker_tool'],
        is_specialized: true,
        church_id: testChurchId
      },
      {
        id: 'agent-002', 
        name: 'pastoral_care_agent',
        role: 'Pastoral Care Coordinator',
        goal: 'Coordinate pastoral care activities and follow-ups',
        backstory: 'Manages pastoral care workflows and member needs',
        tools: ['member_lookup_tool', 'task_creator_tool', 'calendar_tool'],
        is_specialized: true,
        church_id: testChurchId
      },
      {
        id: 'agent-003',
        name: 'event_coordinator_agent', 
        role: 'Event Management Specialist',
        goal: 'Coordinate church events and manage registrations',
        backstory: 'Handles event planning and member coordination',
        tools: ['event_manager_tool', 'email_sender_tool', 'calendar_tool'],
        is_specialized: true,
        church_id: testChurchId
      }
    ];

    const { error: agentError } = await supabase
      .from('agent_definitions')
      .upsert(specializedAgents);

    if (agentError) {
      console.error('Error creating agents:', agentError);
      return false;
    }

    console.log(`✓ Created ${specializedAgents.length} specialized agents`);

    // Create test crew execution
    const testExecution = {
      id: 'exec-001',
      church_id: testChurchId,
      crew_id: 'crew-001',
      status: 'PENDING',
      inputs: { 
        task: 'Test pastoral care workflow',
        member_id: 'member-001'
      },
      outputs: null,
      started_at: new Date().toISOString(),
      completed_at: null
    };

    const { error: execError } = await supabase
      .from('crew_executions')
      .upsert(testExecution);

    if (execError) {
      console.error('Error creating execution:', execError);
      return false;
    }

    console.log('✓ Created test crew execution');
    console.log('Agent test data population completed successfully!');
    return true;

  } catch (error) {
    console.error('Failed to populate agent test data:', error);
    return false;
  }
}

populateAgentTestData();
