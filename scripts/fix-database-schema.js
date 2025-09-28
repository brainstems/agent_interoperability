const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMissingTables() {
  try {
    console.log('Creating missing database tables...');

    // Create agent_definitions table
    const { error: agentDefError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS agent_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          goal TEXT NOT NULL,
          backstory TEXT NOT NULL,
          tools JSONB DEFAULT '[]',
          is_specialized BOOLEAN DEFAULT false,
          church_id UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    });

    if (agentDefError) {
      console.log('Agent definitions table may already exist or error:', agentDefError);
    } else {
      console.log('✓ Created agent_definitions table');
    }

    // Create crew_executions table
    const { error: crewExecError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crew_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          church_id UUID NOT NULL,
          crew_id UUID NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
          inputs JSONB DEFAULT '{}',
          outputs JSONB DEFAULT '{}',
          error_message TEXT,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    });

    if (crewExecError) {
      console.log('Crew executions table may already exist or error:', crewExecError);
    } else {
      console.log('✓ Created crew_executions table');
    }

    // Create member_engagement_events table
    const { error: engagementError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS member_engagement_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          member_id UUID NOT NULL,
          church_id UUID NOT NULL,
          engagement_type TEXT NOT NULL,
          engagement_score INTEGER NOT NULL DEFAULT 1,
          event_data JSONB DEFAULT '{}',
          source TEXT NOT NULL DEFAULT 'web_tracker',
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    });

    if (engagementError) {
      console.log('Member engagement events table may already exist or error:', engagementError);
    } else {
      console.log('✓ Created member_engagement_events table');
    }

    console.log('Database schema fixes completed!');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createMissingTables();
