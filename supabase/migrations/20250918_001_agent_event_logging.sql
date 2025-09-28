-- Migration: Agent Event Logging Tables
-- Description: Add tables to support AI agent event subscription and logging

-- Agent event logs table for tracking agent responses to events
CREATE TABLE IF NOT EXISTS agent_event_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    event_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    error_message TEXT,
    processing_duration_ms INTEGER,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent subscriptions table for managing agent event subscriptions
CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id VARCHAR(255) UNIQUE NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    event_types TEXT[] NOT NULL,
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent performance metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(100) NOT NULL,
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
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

-- Engagement tracking table for member engagement events
CREATE TABLE IF NOT EXISTS member_engagement_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    engagement_type VARCHAR(50) NOT NULL,
    engagement_score INTEGER DEFAULT 1,
    event_data JSONB,
    source VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_event_logs_agent_type ON agent_event_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_event_logs_event_type ON agent_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_event_logs_church_id ON agent_event_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_agent_event_logs_status ON agent_event_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_event_logs_processed_at ON agent_event_logs(processed_at);

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_agent_type ON agent_subscriptions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_church_id ON agent_subscriptions(church_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_is_active ON agent_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_type ON agent_performance_metrics(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_church_id ON agent_performance_metrics(church_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_date ON agent_performance_metrics(date);

CREATE INDEX IF NOT EXISTS idx_member_engagement_events_member_id ON member_engagement_events(member_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_church_id ON member_engagement_events(church_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_type ON member_engagement_events(engagement_type);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_timestamp ON member_engagement_events(timestamp);

-- RLS Policies
ALTER TABLE agent_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_engagement_events ENABLE ROW LEVEL SECURITY;

-- Agent event logs policies
CREATE POLICY "Users can view agent event logs for their church" ON agent_event_logs
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM church_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert agent event logs" ON agent_event_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update agent event logs" ON agent_event_logs
    FOR UPDATE USING (true);

-- Agent subscriptions policies
CREATE POLICY "Users can view agent subscriptions for their church" ON agent_subscriptions
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM church_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage agent subscriptions" ON agent_subscriptions
    FOR ALL USING (
        church_id IN (
            SELECT church_id FROM church_users 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Agent performance metrics policies
CREATE POLICY "Users can view agent performance metrics for their church" ON agent_performance_metrics
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM church_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage agent performance metrics" ON agent_performance_metrics
    FOR ALL USING (true);

-- Member engagement events policies
CREATE POLICY "Users can view member engagement events for their church" ON member_engagement_events
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM church_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage member engagement events" ON member_engagement_events
    FOR ALL USING (true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_agent_event_logs_updated_at 
    BEFORE UPDATE ON agent_event_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_subscriptions_updated_at 
    BEFORE UPDATE ON agent_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_performance_metrics_updated_at 
    BEFORE UPDATE ON agent_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to aggregate daily agent performance metrics
CREATE OR REPLACE FUNCTION aggregate_agent_performance_metrics()
RETURNS void AS $$
BEGIN
    INSERT INTO agent_performance_metrics (
        agent_type,
        church_id,
        date,
        events_processed,
        events_successful,
        events_failed,
        avg_processing_time_ms,
        tasks_created,
        emails_sent,
        workflows_triggered
    )
    SELECT 
        agent_type,
        church_id,
        DATE(processed_at) as date,
        COUNT(*) as events_processed,
        COUNT(*) FILTER (WHERE status = 'completed') as events_successful,
        COUNT(*) FILTER (WHERE status = 'error') as events_failed,
        AVG(processing_duration_ms) as avg_processing_time_ms,
        COUNT(*) FILTER (WHERE event_type LIKE 'task.%') as tasks_created,
        COUNT(*) FILTER (WHERE event_type LIKE 'email.%') as emails_sent,
        COUNT(*) FILTER (WHERE event_type LIKE 'workflow.%') as workflows_triggered
    FROM agent_event_logs
    WHERE DATE(processed_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY agent_type, church_id, DATE(processed_at)
    ON CONFLICT (agent_type, church_id, date) 
    DO UPDATE SET
        events_processed = EXCLUDED.events_processed,
        events_successful = EXCLUDED.events_successful,
        events_failed = EXCLUDED.events_failed,
        avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
        tasks_created = EXCLUDED.tasks_created,
        emails_sent = EXCLUDED.emails_sent,
        workflows_triggered = EXCLUDED.workflows_triggered,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
