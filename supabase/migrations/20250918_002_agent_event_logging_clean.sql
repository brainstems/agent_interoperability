-- Clean Agent Event Logging Migration
-- Only create tables that don't exist

-- Agent event logs table
CREATE TABLE IF NOT EXISTS agent_event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    event_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    church_id UUID NOT NULL,
    session_id VARCHAR(255),
    subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    error_message TEXT,
    processing_duration_ms INTEGER,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Member engagement events table
CREATE TABLE IF NOT EXISTS member_engagement_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL,
    church_id UUID NOT NULL,
    engagement_type VARCHAR(50) NOT NULL,
    engagement_score INTEGER DEFAULT 1,
    event_data JSONB,
    source VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent performance metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    church_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    events_processed INTEGER DEFAULT 0,
    events_successful INTEGER DEFAULT 0,
    events_failed INTEGER DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,2),
    tasks_created INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    workflows_triggered INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_type, church_id, date)
);

-- Create indexes only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agent_event_logs_agent_type') THEN
        CREATE INDEX idx_agent_event_logs_agent_type ON agent_event_logs(agent_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_agent_event_logs_church_id') THEN
        CREATE INDEX idx_agent_event_logs_church_id ON agent_event_logs(church_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_engagement_events_member_id') THEN
        CREATE INDEX idx_member_engagement_events_member_id ON member_engagement_events(member_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_member_engagement_events_church_id') THEN
        CREATE INDEX idx_member_engagement_events_church_id ON member_engagement_events(church_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE agent_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert agent event logs' AND tablename = 'agent_event_logs') THEN
        CREATE POLICY "System can insert agent event logs" ON agent_event_logs FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can manage member engagement events' AND tablename = 'member_engagement_events') THEN
        CREATE POLICY "System can manage member engagement events" ON member_engagement_events FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can manage agent performance metrics' AND tablename = 'agent_performance_metrics') THEN
        CREATE POLICY "System can manage agent performance metrics" ON agent_performance_metrics FOR ALL USING (true);
    END IF;
END $$;
