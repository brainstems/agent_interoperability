-- Create missing tables for agent tests

-- Create agent_definitions table if it doesn't exist
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent_definitions_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Create crew_executions table if it doesn't exist
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_crew_executions_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Create member_engagement_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    church_id UUID NOT NULL,
    engagement_type TEXT NOT NULL CHECK (engagement_type IN (
        'page_view', 'form_submission', 'email_open', 'email_click', 
        'attendance', 'donation', 'event_registration', 'website_visit'
    )),
    engagement_score INTEGER NOT NULL DEFAULT 1,
    event_data JSONB DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'web_tracker',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_member_engagement_events_member_id FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_engagement_events_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_definitions_church_id ON agent_definitions(church_id);
CREATE INDEX IF NOT EXISTS idx_agent_definitions_name ON agent_definitions(name);
CREATE INDEX IF NOT EXISTS idx_crew_executions_church_id ON crew_executions(church_id);
CREATE INDEX IF NOT EXISTS idx_crew_executions_status ON crew_executions(status);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_member_id ON member_engagement_events(member_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_church_id ON member_engagement_events(church_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_timestamp ON member_engagement_events(timestamp);

-- Enable RLS on all tables
ALTER TABLE agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_engagement_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_definitions
CREATE POLICY "Users can view agent definitions for their church" ON agent_definitions
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage agent definitions" ON agent_definitions
    FOR ALL USING (true);

-- RLS Policies for crew_executions
CREATE POLICY "Users can view crew executions for their church" ON crew_executions
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage crew executions" ON crew_executions
    FOR ALL USING (true);

-- RLS Policies for member_engagement_events
CREATE POLICY "Users can view engagement events for their church" ON member_engagement_events
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage engagement events" ON member_engagement_events
    FOR ALL USING (true);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_definitions_updated_at
    BEFORE UPDATE ON agent_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_crew_executions_updated_at
    BEFORE UPDATE ON crew_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_member_engagement_events_updated_at
    BEFORE UPDATE ON member_engagement_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
