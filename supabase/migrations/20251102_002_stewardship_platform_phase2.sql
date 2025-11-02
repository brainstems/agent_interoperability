-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 2
-- Campaign & Journey Management with A/B Testing
-- Created: 2025-11-02
-- =====================================================

-- =====================================================
-- 1. CAMPAIGNS (FR-4)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    program_id UUID REFERENCES public.stewardship_programs(id), -- Optional template reference
    -- Campaign basics
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN (
        'stewardship_drive',
        'capital_campaign',
        'volunteer_drive',
        'planned_giving',
        'special_appeal',
        'advent_campaign',
        'lent_campaign',
        'custom'
    )),
    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE,
    commitment_date DATE, -- Key date like "Commitment Sunday"
    liturgical_season TEXT CHECK (liturgical_season IN (
        'advent', 'christmas', 'epiphany', 'lent', 'easter', 
        'pentecost', 'ordinary_time', 'none'
    )),
    -- Goals
    goal_amount DECIMAL(12,2),
    goal_participants INTEGER,
    goal_recurring_donors INTEGER,
    goal_volunteer_hours INTEGER,
    -- Actual results
    actual_amount DECIMAL(12,2) DEFAULT 0,
    actual_participants INTEGER DEFAULT 0,
    actual_recurring_donors INTEGER DEFAULT 0,
    actual_volunteer_hours INTEGER DEFAULT 0,
    -- Status
    status TEXT DEFAULT 'planning' CHECK (status IN (
        'planning', 'active', 'completed', 'paused', 'cancelled'
    )),
    -- Configuration
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}', -- Colors, logo, theme
    tags TEXT[],
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Campaign events link
CREATE TABLE IF NOT EXISTS public.campaign_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_role TEXT CHECK (event_role IN (
        'kickoff', 'commitment_day', 'testimony', 'volunteer_fair', 
        'celebration', 'follow_up', 'general'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, event_id)
);

-- =====================================================
-- 2. JOURNEY TEMPLATES (FR-5, FR-6)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.journey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id),
    -- Journey basics
    name TEXT NOT NULL,
    description TEXT,
    journey_type TEXT CHECK (journey_type IN (
        'pre_event', 'event_sequence', 'post_event', 
        'onboarding', 're_engagement', 'stewardship', 'custom'
    )),
    -- Trigger configuration
    trigger_type TEXT CHECK (trigger_type IN (
        'campaign_start', 'event_registration', 'pledge_made', 
        'donation_received', 'manual_enrollment', 'date_based', 'custom'
    )),
    trigger_config JSONB DEFAULT '{}',
    -- Journey settings
    is_active BOOLEAN DEFAULT true,
    enable_ab_testing BOOLEAN DEFAULT false,
    default_variant TEXT DEFAULT 'control',
    -- Enrollment rules
    enrollment_criteria JSONB DEFAULT '{}',
    max_enrollments INTEGER,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Journey steps with branching & A/B testing
CREATE TABLE IF NOT EXISTS public.journey_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journey_templates(id) ON DELETE CASCADE,
    -- Step basics
    step_order INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'invite', 'reminder', 'rsvp_request', 'pledge_prompt', 
        'thank_you', 'testimony_request', 'follow_up', 
        'task_create', 'wait', 'branch', 'end'
    )),
    -- A/B Testing variant
    ab_variant TEXT DEFAULT 'control' CHECK (ab_variant IN (
        'control', 'variant_a', 'variant_b', 'variant_c'
    )),
    -- Content
    subject_line TEXT,
    message_content TEXT,
    communication_channel TEXT CHECK (communication_channel IN (
        'email', 'sms', 'push', 'letter', 'phone_call', 'in_person'
    )),
    -- Timing
    delay_type TEXT CHECK (delay_type IN ('immediate', 'hours', 'days', 'weeks', 'date_based')),
    delay_value INTEGER,
    send_time TIME, -- Optimal time of day
    send_days TEXT[], -- Days of week: ['monday', 'wednesday']
    -- Branching logic
    branch_condition JSONB DEFAULT '{}', -- {type: 'if_responded', action: 'skip_to_step_5'}
    next_step_id UUID REFERENCES public.journey_steps(id),
    alternate_step_id UUID REFERENCES public.journey_steps(id), -- For branches
    -- Configuration
    step_config JSONB DEFAULT '{}',
    template_id UUID REFERENCES content_templates(id),
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. JOURNEY ENROLLMENT & EXECUTION (FR-5)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.journey_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journey_templates(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    -- Target
    household_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Journey state
    current_step_id UUID REFERENCES public.journey_steps(id),
    current_step_order INTEGER DEFAULT 0,
    ab_variant TEXT DEFAULT 'control',
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'paused', 'cancelled', 'failed'
    )),
    -- Timing
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    last_step_at TIMESTAMPTZ,
    next_step_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- Analytics
    steps_completed INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0, -- Pledges, RSVPs, etc.
    -- Metadata
    enrollment_source TEXT, -- 'auto', 'manual', 'import'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey step executions (audit trail)
CREATE TABLE IF NOT EXISTS public.journey_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.journey_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
    -- Execution details
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'opened', 'clicked', 
        'responded', 'failed', 'skipped'
    )),
    -- Communication tracking
    communication_id UUID REFERENCES public.communications(id),
    notification_id UUID,
    task_id UUID REFERENCES public.tasks(id),
    -- Response data
    response_data JSONB DEFAULT '{}',
    error_message TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. RSVP TRACKING (FR-7)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    household_id UUID REFERENCES public.families(id),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- RSVP details
    rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN (
        'pending', 'yes', 'no', 'maybe', 'cancelled'
    )),
    attendee_count INTEGER DEFAULT 1,
    guest_names TEXT[],
    dietary_needs TEXT,
    special_requests TEXT,
    -- Response tracking
    rsvp_date TIMESTAMPTZ DEFAULT NOW(),
    rsvp_method TEXT, -- 'online', 'email', 'phone', 'in_person'
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    -- Attendance
    attended BOOLEAN,
    check_in_time TIMESTAMPTZ,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. A/B TESTING & ANALYTICS (FR-6)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.journey_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journey_templates(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.journey_steps(id) ON DELETE CASCADE,
    -- Test configuration
    test_name TEXT NOT NULL,
    test_description TEXT,
    variants JSONB NOT NULL, -- [{variant: 'control', weight: 50}, {variant: 'variant_a', weight: 50}]
    test_metric TEXT, -- 'open_rate', 'click_rate', 'conversion_rate', 'response_rate'
    -- Test status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'running', 'completed', 'paused', 'cancelled'
    )),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    -- Winner selection
    winning_variant TEXT,
    winner_selected_at TIMESTAMPTZ,
    auto_select_winner BOOLEAN DEFAULT true,
    min_sample_size INTEGER DEFAULT 100,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.95,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journey_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journey_templates(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.journey_steps(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    -- Variant data
    ab_variant TEXT DEFAULT 'control',
    -- Metrics
    metric_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'converted'
    metric_value DECIMAL(10,4),
    metric_count INTEGER DEFAULT 0,
    -- Aggregation
    sample_size INTEGER,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    aggregation_level TEXT DEFAULT 'daily' CHECK (aggregation_level IN ('hourly', 'daily', 'weekly')),
    -- Statistical significance
    confidence_level DECIMAL(3,2),
    p_value DECIMAL(6,5),
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_church ON public.campaigns(church_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_program ON public.campaigns(program_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON public.campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_journey_templates_church ON public.journey_templates(church_id);
CREATE INDEX IF NOT EXISTS idx_journey_templates_campaign ON public.journey_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journey_templates_active ON public.journey_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_journey_steps_journey ON public.journey_steps(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_steps_order ON public.journey_steps(journey_id, step_order);
CREATE INDEX IF NOT EXISTS idx_journey_steps_variant ON public.journey_steps(ab_variant);

CREATE INDEX IF NOT EXISTS idx_journey_enrollments_journey ON public.journey_enrollments(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_member ON public.journey_enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_household ON public.journey_enrollments(household_id);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_status ON public.journey_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_next_step ON public.journey_enrollments(next_step_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rsvps_campaign ON public.campaign_rsvps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON public.campaign_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_member ON public.campaign_rsvps(member_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON public.campaign_rsvps(rsvp_status);

CREATE INDEX IF NOT EXISTS idx_journey_analytics_journey ON public.journey_analytics(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_analytics_variant ON public.journey_analytics(ab_variant);
CREATE INDEX IF NOT EXISTS idx_journey_analytics_period ON public.journey_analytics(period_start, period_end);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_analytics ENABLE ROW LEVEL SECURITY;

-- Campaigns: View if in same church or org
CREATE POLICY "Users can view campaigns" 
    ON public.campaigns FOR SELECT 
    TO authenticated 
    USING (
        church_id = public.get_user_church_id()
        OR EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = campaigns.organization_id 
            AND profile_id = auth.uid()
        )
    );

-- Journey enrollments: View own or if staff/admin
CREATE POLICY "Users can view journey enrollments" 
    ON public.journey_enrollments FOR SELECT 
    TO authenticated 
    USING (
        member_id = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- RSVPs: View own or if staff/admin
CREATE POLICY "Users can view rsvps" 
    ON public.campaign_rsvps FOR SELECT 
    TO authenticated 
    USING (
        member_id = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to enroll member in journey
CREATE OR REPLACE FUNCTION public.enroll_in_journey(
    p_journey_id UUID,
    p_member_id UUID,
    p_campaign_id UUID DEFAULT NULL,
    p_household_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_enrollment_id UUID;
    v_first_step_id UUID;
    v_first_step_order INTEGER;
    v_ab_variant TEXT;
BEGIN
    -- Get first step
    SELECT id, step_order, ab_variant INTO v_first_step_id, v_first_step_order, v_ab_variant
    FROM public.journey_steps
    WHERE journey_id = p_journey_id
    ORDER BY step_order
    LIMIT 1;
    
    -- Create enrollment
    INSERT INTO public.journey_enrollments (
        journey_id, member_id, campaign_id, household_id,
        current_step_id, current_step_order, ab_variant, status
    ) VALUES (
        p_journey_id, p_member_id, p_campaign_id, p_household_id,
        v_first_step_id, v_first_step_order, v_ab_variant, 'active'
    )
    RETURNING id INTO v_enrollment_id;
    
    RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate campaign progress
CREATE OR REPLACE FUNCTION public.calculate_campaign_progress(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_progress JSONB;
    v_campaign RECORD;
BEGIN
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    v_progress := jsonb_build_object(
        'amount_progress', CASE 
            WHEN v_campaign.goal_amount > 0 
            THEN ROUND((v_campaign.actual_amount / v_campaign.goal_amount) * 100, 2)
            ELSE 0 
        END,
        'participant_progress', CASE 
            WHEN v_campaign.goal_participants > 0 
            THEN ROUND((v_campaign.actual_participants::DECIMAL / v_campaign.goal_participants) * 100, 2)
            ELSE 0 
        END,
        'days_remaining', EXTRACT(DAY FROM v_campaign.end_date - CURRENT_DATE),
        'days_elapsed', EXTRACT(DAY FROM CURRENT_DATE - v_campaign.start_date)
    );
    
    RETURN v_progress;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_campaigns_update_timestamp
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_journey_templates_update_timestamp
BEFORE UPDATE ON public.journey_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_journey_steps_update_timestamp
BEFORE UPDATE ON public.journey_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
COMMENT ON TABLE public.campaigns IS 'Event-driven stewardship campaigns with goals, timelines, and tracking';
COMMENT ON TABLE public.journey_templates IS 'Automated journey templates with branching, A/B testing, and personalization';
COMMENT ON TABLE public.journey_enrollments IS 'Individual member enrollments in journeys with progress tracking';
COMMENT ON TABLE public.campaign_rsvps IS 'Enhanced RSVP tracking with attendee counts, dietary needs, and confirmations';
