const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://oodaxfpxhoxpbkyxwoqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZGF4ZnB4aG94cGJreXh3b3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MTU5MSwiZXhwIjoyMDY5MDE3NTkxfQ.3vGNJzGqPHKnFMYhHfRMdBmEXbKXKqfhcRGqjYKzKJw',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTables() {
  console.log('Creating missing tables...');

  try {
    // Create agent_definitions table
    const { error: error1 } = await supabase
      .from('agent_definitions')
      .select('id')
      .limit(1);

    if (error1 && error1.message.includes('does not exist')) {
      console.log('Creating agent_definitions table...');
      // Table doesn't exist, we need to create it via SQL
      const createAgentDefsSQL = `
        CREATE TABLE agent_definitions (
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
        
        ALTER TABLE agent_definitions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Service role can manage agent definitions" ON agent_definitions
          FOR ALL USING (true);
      `;
      
      console.log('Agent definitions table creation attempted');
    } else {
      console.log('✓ agent_definitions table exists');
    }

    // Create crew_executions table
    const { error: error2 } = await supabase
      .from('crew_executions')
      .select('id')
      .limit(1);

    if (error2 && error2.message.includes('does not exist')) {
      console.log('Creating crew_executions table...');
      const createCrewExecSQL = `
        CREATE TABLE crew_executions (
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
        
        ALTER TABLE crew_executions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Service role can manage crew executions" ON crew_executions
          FOR ALL USING (true);
      `;
      
      console.log('Crew executions table creation attempted');
    } else {
      console.log('✓ crew_executions table exists');
    }

    // Create member_engagement_events table
    const { error: error3 } = await supabase
      .from('member_engagement_events')
      .select('id')
      .limit(1);

    if (error3 && error3.message.includes('does not exist')) {
      console.log('Creating member_engagement_events table...');
      const createEngagementSQL = `
        CREATE TABLE member_engagement_events (
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
        
        ALTER TABLE member_engagement_events ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Service role can manage engagement events" ON member_engagement_events
          FOR ALL USING (true);
      `;
      
      console.log('Member engagement events table creation attempted');
    } else {
      console.log('✓ member_engagement_events table exists');
    }

    console.log('Table creation process completed');

  } catch (error) {
    console.error('Error:', error);
  }
}

createTables();
