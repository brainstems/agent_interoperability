-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 1
-- Organization Hierarchy & Multi-Church Management
-- Created: 2025-11-02
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ORGANIZATION HIERARCHY (FR-1)
-- =====================================================

-- Diocese/Network/Denomination organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL CHECK (organization_type IN ('diocese', 'network', 'denomination', 'association')),
    parent_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    description TEXT,
    contact_info JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    -- Configuration
    branding JSONB DEFAULT '{}', -- Logo, colors, fonts
    compliance_settings JSONB DEFAULT '{}', -- ECFA, GDPR preferences
    default_permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Add organization link to churches
ALTER TABLE public.churches 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_category TEXT;

-- Organizational roles and permissions
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('org_admin', 'church_admin', 'finance_lead', 'comms_lead', 'viewer')),
    permissions JSONB DEFAULT '{}',
    church_id UUID REFERENCES public.churches(id), -- Optional: scoped to specific church
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id),
    UNIQUE(organization_id, profile_id, church_id)
);

-- =====================================================
-- 2. STEWARDSHIP PROGRAMS & TEMPLATES (FR-2)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stewardship_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id), -- NULL = organization-wide template
    name TEXT NOT NULL,
    description TEXT,
    program_type TEXT NOT NULL CHECK (program_type IN (
        'annual_stewardship_drive',
        'capital_campaign',
        'planned_giving_month',
        'volunteer_drive',
        'commitment_sunday',
        'advent_appeal',
        'lent_appeal',
        'custom'
    )),
    -- Template configuration
    timeline_config JSONB DEFAULT '{}', -- {weeks: 8, milestones: [...]}
    content_pack JSONB DEFAULT '{}', -- {emails: [], letters: [], sermons: []}
    kpi_targets JSONB DEFAULT '{}', -- {participation_rate: 0.75, pledge_goal: 500000}
    liturgical_alignment TEXT, -- 'advent', 'lent', 'ordinary_time', etc.
    -- Best practices & guidance
    best_practices JSONB DEFAULT '[]',
    resource_urls JSONB DEFAULT '[]',
    success_stories JSONB DEFAULT '[]',
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Program content assets
CREATE TABLE IF NOT EXISTS public.program_content_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.stewardship_programs(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'email_template',
        'letter_template',
        'sermon_outline',
        'testimony_guide',
        'pledge_card',
        'presentation_slide',
        'social_media_post',
        'video_script'
    )),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Template variables
    metadata JSONB DEFAULT '{}',
    display_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. BENCHMARKING SYSTEM (FR-3)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.church_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    benchmark_period TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Core metrics
    metrics JSONB NOT NULL DEFAULT '{}', -- Structured metrics object
    participation_rate DECIMAL(5,4), -- Calculated field for indexing
    pledge_conversion_rate DECIMAL(5,4),
    recurring_enrollment_rate DECIMAL(5,4),
    volunteer_hours INTEGER,
    avg_gift_amount DECIMAL(10,2),
    -- Comparative data
    church_size_category TEXT CHECK (church_size_category IN ('small', 'medium', 'large', 'mega')),
    geographic_region TEXT,
    -- Privacy & sharing
    is_opt_in BOOLEAN DEFAULT false,
    is_anonymized BOOLEAN DEFAULT true,
    sharing_level TEXT DEFAULT 'organization' CHECK (sharing_level IN ('private', 'organization', 'public')),
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, benchmark_period, period_start)
);

-- Benchmark aggregates for quick comparisons
CREATE TABLE IF NOT EXISTS public.benchmark_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    benchmark_period TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    church_size_category TEXT,
    geographic_region TEXT,
    -- Aggregate statistics
    metric_name TEXT NOT NULL,
    metric_value_avg DECIMAL(12,4),
    metric_value_median DECIMAL(12,4),
    metric_value_p25 DECIMAL(12,4),
    metric_value_p75 DECIMAL(12,4),
    sample_size INTEGER,
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_churches_organization ON public.churches(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile ON public.organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_programs_org ON public.stewardship_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_church ON public.stewardship_programs(church_id);
CREATE INDEX IF NOT EXISTS idx_programs_type ON public.stewardship_programs(program_type);
CREATE INDEX IF NOT EXISTS idx_benchmarks_church ON public.church_benchmarks(church_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_org ON public.church_benchmarks(organization_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_period ON public.church_benchmarks(period_start, period_end);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stewardship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_aggregates ENABLE ROW LEVEL SECURITY;

-- Organizations: View if member or if church is in org
CREATE POLICY "Users can view their organizations" 
    ON public.organizations FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = organizations.id 
            AND profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.churches 
            WHERE organization_id = organizations.id 
            AND id = public.get_user_church_id()
        )
    );

-- Organization members: View if in same org
CREATE POLICY "Users can view org members" 
    ON public.organization_members FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om2
            WHERE om2.organization_id = organization_members.organization_id 
            AND om2.profile_id = auth.uid()
        )
    );

-- Programs: View if in org or church
CREATE POLICY "Users can view programs" 
    ON public.stewardship_programs FOR SELECT 
    TO authenticated 
    USING (
        is_published = true
        OR church_id = public.get_user_church_id()
        OR EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = stewardship_programs.organization_id 
            AND profile_id = auth.uid()
        )
    );

-- Benchmarks: View based on sharing level
CREATE POLICY "Users can view benchmarks" 
    ON public.church_benchmarks FOR SELECT 
    TO authenticated 
    USING (
        church_id = public.get_user_church_id()
        OR (sharing_level = 'organization' AND EXISTS (
            SELECT 1 FROM public.churches c
            JOIN public.organization_members om ON om.organization_id = c.organization_id
            WHERE c.id = church_benchmarks.church_id
            AND om.profile_id = auth.uid()
        ))
        OR (sharing_level = 'public' AND is_opt_in = true)
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get organization hierarchy
CREATE OR REPLACE FUNCTION public.get_organization_hierarchy(org_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    organization_type TEXT,
    level INTEGER,
    path UUID[]
) AS $$
WITH RECURSIVE org_tree AS (
    -- Base case
    SELECT 
        o.id,
        o.name,
        o.organization_type,
        0 AS level,
        ARRAY[o.id] AS path
    FROM public.organizations o
    WHERE o.id = org_id
    
    UNION ALL
    
    -- Recursive case
    SELECT 
        o.id,
        o.name,
        o.organization_type,
        ot.level + 1,
        ot.path || o.id
    FROM public.organizations o
    JOIN org_tree ot ON o.parent_id = ot.id
)
SELECT * FROM org_tree ORDER BY level;
$$ LANGUAGE SQL STABLE;

-- Function to calculate benchmark metrics for a church
CREATE OR REPLACE FUNCTION public.calculate_church_benchmarks(
    p_church_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
    v_total_members INTEGER;
    v_total_donations DECIMAL(12,2);
    v_total_pledges INTEGER;
    v_recurring_count INTEGER;
    v_volunteer_hours INTEGER;
BEGIN
    -- Count active members
    SELECT COUNT(*) INTO v_total_members
    FROM public.profiles
    WHERE church_id = p_church_id
    AND is_active = true
    AND member_status IN ('MEMBER', 'REGULAR_ATTENDEE');
    
    -- Sum donations
    SELECT COALESCE(SUM(amount), 0) INTO v_total_donations
    FROM public.donations
    WHERE church_id = p_church_id
    AND donation_date BETWEEN p_period_start AND p_period_end;
    
    -- Count pledges
    SELECT COUNT(*) INTO v_total_pledges
    FROM pledges
    WHERE church_id = p_church_id
    AND start_date <= p_period_end
    AND (end_date >= p_period_start OR end_date IS NULL);
    
    -- Count recurring donors
    SELECT COUNT(*) INTO v_recurring_count
    FROM recurring_donations
    WHERE church_id = p_church_id
    AND status = 'ACTIVE'
    AND start_date <= p_period_end;
    
    -- Aggregate volunteer hours (placeholder - would integrate with time tracking)
    v_volunteer_hours := 0;
    
    -- Build metrics object
    v_metrics := jsonb_build_object(
        'total_members', v_total_members,
        'total_donations', v_total_donations,
        'total_pledges', v_total_pledges,
        'recurring_donors', v_recurring_count,
        'volunteer_hours', v_volunteer_hours,
        'participation_rate', CASE 
            WHEN v_total_members > 0 THEN ROUND((v_total_pledges::DECIMAL / v_total_members), 4)
            ELSE 0
        END,
        'avg_gift', CASE 
            WHEN v_total_pledges > 0 THEN ROUND((v_total_donations / v_total_pledges), 2)
            ELSE 0
        END
    );
    
    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp on organizations
CREATE TRIGGER on_organizations_update_timestamp
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp on programs
CREATE TRIGGER on_programs_update_timestamp
BEFORE UPDATE ON public.stewardship_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default organization types
INSERT INTO public.organizations (id, name, organization_type, description, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Independent Churches', 'network', 'Standalone churches without organizational affiliation', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample stewardship program templates
INSERT INTO public.stewardship_programs (
    id,
    organization_id,
    name,
    description,
    program_type,
    timeline_config,
    is_published,
    is_active
)
VALUES 
    (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001',
        'Annual Stewardship Drive - 8 Week Program',
        'Comprehensive 8-week program for annual stewardship commitment Sunday',
        'annual_stewardship_drive',
        '{"weeks": 8, "milestones": ["Kickoff", "Testimonies", "Commitment Sunday", "Follow-up", "Thank You"], "key_dates": []}'::jsonb,
        true,
        true
    ),
    (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001',
        'Capital Campaign - 18 Month Template',
        'Multi-phase capital campaign for major building or ministry initiatives',
        'capital_campaign',
        '{"months": 18, "phases": ["Discernment", "Leadership Gifts", "Public Launch", "General Campaign", "Celebration"], "key_dates": []}'::jsonb,
        true,
        true
    )
ON CONFLICT DO NOTHING;

-- Migration complete
COMMENT ON TABLE public.organizations IS 'Diocese, network, and denomination organizational hierarchy for multi-church management';
COMMENT ON TABLE public.stewardship_programs IS 'Reusable program templates with timelines, content packs, and best practices';
COMMENT ON TABLE public.church_benchmarks IS 'Anonymized metrics for cross-church benchmarking and comparative insights';
