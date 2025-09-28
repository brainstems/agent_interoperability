-- Create member_engagement_events table for tracking member interactions
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_member_id ON member_engagement_events(member_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_church_id ON member_engagement_events(church_id);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_timestamp ON member_engagement_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_member_engagement_events_type ON member_engagement_events(engagement_type);

-- Add foreign key constraints
ALTER TABLE member_engagement_events 
ADD CONSTRAINT fk_member_engagement_events_member_id 
FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE member_engagement_events 
ADD CONSTRAINT fk_member_engagement_events_church_id 
FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE member_engagement_events ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their church's engagement data
CREATE POLICY "Users can view engagement events for their church" ON member_engagement_events
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy for service role to insert engagement events
CREATE POLICY "Service role can insert engagement events" ON member_engagement_events
    FOR INSERT WITH CHECK (true);

-- Policy for authenticated users to insert engagement events for their church
CREATE POLICY "Users can insert engagement events for their church" ON member_engagement_events
    FOR INSERT WITH CHECK (
        church_id IN (
            SELECT church_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_member_engagement_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_member_engagement_events_updated_at
    BEFORE UPDATE ON member_engagement_events
    FOR EACH ROW
    EXECUTE FUNCTION update_member_engagement_events_updated_at();
