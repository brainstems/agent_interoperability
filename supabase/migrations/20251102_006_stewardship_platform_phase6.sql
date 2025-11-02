-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 6
-- Impact Reporting & Transparency (FR-24, FR-25, FR-26)
-- Created: 2025-11-02
-- =====================================================

-- =====================================================
-- 1. IMPACT STORIES & NARRATIVES (FR-24)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.impact_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id),
    fund_id UUID REFERENCES public.funds(id),
    -- Story details
    title TEXT NOT NULL,
    subtitle TEXT,
    story_body TEXT NOT NULL,
    story_type TEXT CHECK (story_type IN (
        'testimony', 'ministry_update', 'campaign_milestone',
        'transformation_story', 'volunteer_spotlight', 'donor_impact',
        'community_outcome', 'mission_report'
    )),
    -- Attribution
    author_id UUID REFERENCES public.profiles(id),
    featured_member_id UUID REFERENCES public.profiles(id),
    consent_obtained BOOLEAN DEFAULT false,
    attribution_preference TEXT, -- 'anonymous', 'first_name', 'full_name'
    -- Media
    featured_image_url TEXT,
    media_urls JSONB DEFAULT '[]', -- Additional photos/videos
    media_captions JSONB DEFAULT '{}',
    -- Metrics & impact
    lives_impacted INTEGER,
    financial_impact DECIMAL(12,2),
    volunteer_hours INTEGER,
    impact_metrics JSONB DEFAULT '{}',
    -- Publishing
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    featured_until TIMESTAMPTZ,
    display_order INTEGER DEFAULT 0,
    -- Channels
    show_in_newsletter BOOLEAN DEFAULT true,
    show_on_website BOOLEAN DEFAULT true,
    show_in_reports BOOLEAN DEFAULT true,
    show_in_appeal BOOLEAN DEFAULT false,
    -- Tags & categorization
    tags TEXT[],
    ministry_areas TEXT[],
    scripture_references TEXT[],
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_impact_stories_church ON public.impact_stories(church_id);
CREATE INDEX IF NOT EXISTS idx_impact_stories_campaign ON public.impact_stories(campaign_id);
CREATE INDEX IF NOT EXISTS idx_impact_stories_fund ON public.impact_stories(fund_id);
CREATE INDEX IF NOT EXISTS idx_impact_stories_type ON public.impact_stories(story_type);
CREATE INDEX IF NOT EXISTS idx_impact_stories_featured ON public.impact_stories(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_impact_stories_tags ON public.impact_stories USING gin(tags);

-- =====================================================
-- 2. NARRATIVE BUDGETS (FR-24)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.narrative_budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES budgets(id),
    campaign_id UUID REFERENCES public.campaigns(id),
    -- Budget item details
    category TEXT NOT NULL,
    subcategory TEXT,
    amount DECIMAL(12,2) NOT NULL,
    percentage_of_total DECIMAL(5,2),
    -- Narrative description
    description TEXT NOT NULL, -- Human-readable purpose
    impact_description TEXT, -- Expected impact
    success_metrics TEXT[], -- How success will be measured
    -- Story linkage
    impact_story_id UUID REFERENCES public.impact_stories(id),
    related_ministry TEXT,
    -- Visual presentation
    visual_config JSONB DEFAULT '{}', -- Chart colors, icons, etc.
    icon_name TEXT,
    color_hex TEXT,
    display_order INTEGER DEFAULT 0,
    -- Actual vs. budgeted
    actual_spent DECIMAL(12,2) DEFAULT 0,
    variance DECIMAL(12,2) DEFAULT 0,
    variance_explanation TEXT,
    -- Time period
    fiscal_year INTEGER,
    period_start DATE,
    period_end DATE,
    -- Visibility
    show_publicly BOOLEAN DEFAULT true,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_narrative_budget_church ON public.narrative_budget_items(church_id);
CREATE INDEX IF NOT EXISTS idx_narrative_budget_campaign ON public.narrative_budget_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_narrative_budget_year ON public.narrative_budget_items(fiscal_year);

-- =====================================================
-- 3. GIVING STATEMENTS (FR-25)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.giving_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.families(id),
    -- Statement period
    statement_type TEXT DEFAULT 'annual' CHECK (statement_type IN (
        'quarterly', 'annual', 'year_end', 'campaign'
    )),
    statement_year INTEGER NOT NULL,
    statement_quarter INTEGER CHECK (statement_quarter BETWEEN 1 AND 4),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Financial summary
    total_amount DECIMAL(12,2) NOT NULL,
    total_tax_deductible DECIMAL(12,2),
    total_non_deductible DECIMAL(12,2),
    donation_count INTEGER NOT NULL,
    -- Fund breakdown
    fund_breakdown JSONB NOT NULL, -- [{fund_name, fund_id, amount, percentage}]
    pledge_breakdown JSONB DEFAULT '{}', -- Progress on active pledges
    recurring_summary JSONB DEFAULT '{}', -- Recurring donation details
    -- Impact summary
    impact_summary TEXT,
    impact_stories_included UUID[], -- IDs of impact stories to include
    thank_you_message TEXT,
    pastoral_note TEXT,
    -- Document generation
    generated_pdf_url TEXT,
    generated_pdf_size INTEGER,
    template_used TEXT,
    -- Delivery
    delivery_method TEXT CHECK (delivery_method IN ('email', 'mail', 'portal', 'both')),
    sent_at TIMESTAMPTZ,
    sent_via_email BOOLEAN DEFAULT false,
    sent_via_mail BOOLEAN DEFAULT false,
    email_opened_at TIMESTAMPTZ,
    email_downloaded_at TIMESTAMPTZ,
    -- Tax compliance
    is_tax_receipt BOOLEAN DEFAULT true,
    tax_id_included BOOLEAN DEFAULT true,
    church_tax_id TEXT,
    compliance_note TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, member_id, statement_year, statement_quarter, statement_type)
);

CREATE INDEX IF NOT EXISTS idx_giving_statements_church ON public.giving_statements(church_id);
CREATE INDEX IF NOT EXISTS idx_giving_statements_member ON public.giving_statements(member_id);
CREATE INDEX IF NOT EXISTS idx_giving_statements_year ON public.giving_statements(statement_year, statement_quarter);
CREATE INDEX IF NOT EXISTS idx_giving_statements_sent ON public.giving_statements(sent_at);

-- =====================================================
-- 4. IMPACT DASHBOARDS & METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id),
    fund_id UUID REFERENCES public.funds(id),
    -- Metric details
    metric_name TEXT NOT NULL,
    metric_category TEXT CHECK (metric_category IN (
        'financial', 'participation', 'ministry', 'outreach',
        'spiritual', 'volunteer', 'facility', 'community'
    )),
    metric_type TEXT CHECK (metric_type IN (
        'count', 'amount', 'percentage', 'ratio', 'score'
    )),
    -- Values
    metric_value DECIMAL(12,2) NOT NULL,
    metric_target DECIMAL(12,2),
    metric_unit TEXT, -- 'dollars', 'people', 'hours', 'percent'
    -- Comparison
    previous_period_value DECIMAL(12,2),
    percent_change DECIMAL(7,2),
    trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
    -- Time period
    period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Display
    display_order INTEGER DEFAULT 0,
    is_highlighted BOOLEAN DEFAULT false,
    visualization_type TEXT, -- 'number', 'chart', 'gauge', 'progress_bar'
    -- Metadata
    description TEXT,
    calculation_method TEXT,
    data_sources TEXT[],
    last_updated_at TIMESTAMPTZ,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impact_metrics_church ON public.impact_metrics(church_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_campaign ON public.impact_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_period ON public.impact_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_category ON public.impact_metrics(metric_category);

-- =====================================================
-- 5. PUBLIC TRANSPARENCY REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.transparency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    -- Report details
    report_type TEXT NOT NULL CHECK (report_type IN (
        'annual_financial', 'campaign_summary', 'impact_report',
        'ministry_yearbook', 'stewardship_update', 'transparency_dashboard'
    )),
    report_title TEXT NOT NULL,
    report_subtitle TEXT,
    fiscal_year INTEGER,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Content sections
    executive_summary TEXT,
    financial_summary JSONB, -- High-level numbers
    ministry_highlights JSONB, -- Key accomplishments
    impact_stories UUID[], -- References to impact_stories table
    narrative_budget UUID[], -- References to narrative_budget_items
    key_metrics JSONB, -- Important metrics to highlight
    -- Presentation
    cover_image_url TEXT,
    template_id UUID,
    branding_config JSONB,
    -- Publishing
    is_published BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    public_url TEXT,
    -- Documents
    pdf_url TEXT,
    interactive_url TEXT,
    presentation_url TEXT,
    -- Distribution
    sent_to_members BOOLEAN DEFAULT false,
    sent_to_leadership BOOLEAN DEFAULT false,
    posted_to_website BOOLEAN DEFAULT false,
    posted_to_social BOOLEAN DEFAULT false,
    -- Compliance
    ecfa_compliant BOOLEAN DEFAULT false,
    audit_reviewed BOOLEAN DEFAULT false,
    board_approved BOOLEAN DEFAULT false,
    board_approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_transparency_reports_church ON public.transparency_reports(church_id);
CREATE INDEX IF NOT EXISTS idx_transparency_reports_year ON public.transparency_reports(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_transparency_reports_published ON public.transparency_reports(is_published, is_public);

-- =====================================================
-- 6. CAMPAIGN MICROSITES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_microsites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    -- Site details
    site_name TEXT NOT NULL,
    site_slug TEXT NOT NULL,
    site_url TEXT UNIQUE,
    -- Content
    hero_image_url TEXT,
    hero_headline TEXT,
    hero_subheadline TEXT,
    story_sections JSONB DEFAULT '[]', -- Ordered sections
    impact_stories UUID[], -- Featured stories
    testimonials JSONB DEFAULT '[]',
    faq_items JSONB DEFAULT '[]',
    -- Giving integration
    show_thermometer BOOLEAN DEFAULT true,
    show_recent_gifts BOOLEAN DEFAULT false,
    show_top_donors BOOLEAN DEFAULT false,
    anonymous_recent_gifts BOOLEAN DEFAULT true,
    -- Progress tracking
    current_amount DECIMAL(12,2) DEFAULT 0,
    goal_amount DECIMAL(12,2),
    donor_count INTEGER DEFAULT 0,
    volunteer_count INTEGER DEFAULT 0,
    -- Design
    theme_config JSONB DEFAULT '{}',
    custom_css TEXT,
    -- Features
    enable_giving BOOLEAN DEFAULT true,
    enable_pledging BOOLEAN DEFAULT true,
    enable_volunteering BOOLEAN DEFAULT true,
    enable_comments BOOLEAN DEFAULT false,
    enable_sharing BOOLEAN DEFAULT true,
    -- Analytics
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER,
    conversion_rate DECIMAL(5,4),
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, site_slug)
);

CREATE INDEX IF NOT EXISTS idx_microsites_campaign ON public.campaign_microsites(campaign_id);
CREATE INDEX IF NOT EXISTS idx_microsites_slug ON public.campaign_microsites(site_slug);
CREATE INDEX IF NOT EXISTS idx_microsites_active ON public.campaign_microsites(is_active, is_public);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.impact_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transparency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_microsites ENABLE ROW LEVEL SECURITY;

-- Impact stories: Public if published, otherwise church-only
CREATE POLICY "Users can view impact stories" 
    ON public.impact_stories FOR SELECT 
    TO authenticated 
    USING (
        is_public = true
        OR church_id = public.get_user_church_id()
    );

-- Giving statements: Own statements only
CREATE POLICY "Users can view own giving statements" 
    ON public.giving_statements FOR SELECT 
    TO authenticated 
    USING (
        member_id = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- Public policies for transparency
CREATE POLICY "Anyone can view public transparency reports" 
    ON public.transparency_reports FOR SELECT 
    TO authenticated 
    USING (is_public = true AND is_published = true);

CREATE POLICY "Anyone can view public microsites" 
    ON public.campaign_microsites FOR SELECT 
    TO authenticated 
    USING (is_public = true AND is_active = true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate giving statement for member
CREATE OR REPLACE FUNCTION public.generate_giving_statement(
    p_member_id UUID,
    p_year INTEGER,
    p_quarter INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_statement_id UUID;
    v_church_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_amount DECIMAL(12,2);
    v_donation_count INTEGER;
    v_fund_breakdown JSONB;
BEGIN
    -- Get church_id
    SELECT church_id INTO v_church_id FROM profiles WHERE id = p_member_id;
    
    -- Calculate period
    IF p_quarter IS NULL THEN
        p_period_start := DATE(p_year || '-01-01');
        p_period_end := DATE(p_year || '-12-31');
    ELSE
        p_period_start := DATE(p_year || '-' || ((p_quarter - 1) * 3 + 1) || '-01');
        p_period_end := (p_period_start + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
    END IF;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO v_total_amount, v_donation_count
    FROM donations
    WHERE donor_id = p_member_id
    AND donation_date BETWEEN p_period_start AND p_period_end;
    
    -- Build fund breakdown
    SELECT jsonb_agg(
        jsonb_build_object(
            'fund_id', f.id,
            'fund_name', f.name,
            'amount', fund_totals.total,
            'percentage', ROUND((fund_totals.total / NULLIF(v_total_amount, 0)) * 100, 2)
        )
    ) INTO v_fund_breakdown
    FROM (
        SELECT fund_id, SUM(amount) as total
        FROM donations
        WHERE donor_id = p_member_id
        AND donation_date BETWEEN p_period_start AND p_period_end
        GROUP BY fund_id
    ) fund_totals
    JOIN funds f ON f.id = fund_totals.fund_id;
    
    -- Create statement
    INSERT INTO public.giving_statements (
        church_id, member_id, statement_year, statement_quarter,
        period_start, period_end, total_amount, donation_count, fund_breakdown
    ) VALUES (
        v_church_id, p_member_id, p_year, p_quarter,
        p_period_start, p_period_end, v_total_amount, v_donation_count,
        COALESCE(v_fund_breakdown, '[]'::jsonb)
    )
    ON CONFLICT (church_id, member_id, statement_year, statement_quarter, statement_type)
    DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        donation_count = EXCLUDED.donation_count,
        fund_breakdown = EXCLUDED.fund_breakdown,
        updated_at = NOW()
    RETURNING id INTO v_statement_id;
    
    RETURN v_statement_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate campaign impact metrics
CREATE OR REPLACE FUNCTION public.calculate_campaign_impact(
    p_campaign_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_impact JSONB;
    v_total_raised DECIMAL(12,2);
    v_total_donors INTEGER;
    v_total_pledges INTEGER;
    v_avg_gift DECIMAL(10,2);
    v_participation_rate DECIMAL(5,4);
BEGIN
    -- Calculate financial metrics
    SELECT 
        COALESCE(SUM(d.amount), 0),
        COUNT(DISTINCT d.donor_id),
        ROUND(AVG(d.amount), 2)
    INTO v_total_raised, v_total_donors, v_avg_gift
    FROM donations d
    JOIN pledges p ON p.member_id = d.donor_id
    WHERE p.campaign_id = p_campaign_id;
    
    -- Count pledges
    SELECT COUNT(*) INTO v_total_pledges
    FROM pledges
    WHERE campaign_id = p_campaign_id;
    
    -- Calculate participation rate
    SELECT 
        ROUND(v_total_pledges::DECIMAL / COUNT(*)::DECIMAL, 4)
    INTO v_participation_rate
    FROM profiles
    WHERE church_id = (SELECT church_id FROM campaigns WHERE id = p_campaign_id)
    AND is_active = true;
    
    -- Build impact object
    v_impact := jsonb_build_object(
        'total_raised', v_total_raised,
        'total_donors', v_total_donors,
        'total_pledges', v_total_pledges,
        'avg_gift', v_avg_gift,
        'participation_rate', v_participation_rate,
        'computed_at', NOW()
    );
    
    RETURN v_impact;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_impact_stories_update_timestamp
BEFORE UPDATE ON public.impact_stories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_narrative_budget_update_timestamp
BEFORE UPDATE ON public.narrative_budget_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_giving_statements_update_timestamp
BEFORE UPDATE ON public.giving_statements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_transparency_reports_update_timestamp
BEFORE UPDATE ON public.transparency_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_microsites_update_timestamp
BEFORE UPDATE ON public.campaign_microsites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.impact_stories IS 'Ministry impact stories and testimonies with consent and attribution management';
COMMENT ON TABLE public.narrative_budget_items IS 'Human-readable budget presentations with impact descriptions';
COMMENT ON TABLE public.giving_statements IS 'Automated giving statements with fund breakdowns and impact summaries';
COMMENT ON TABLE public.impact_metrics IS 'Quantified impact metrics for dashboards and reporting';
COMMENT ON TABLE public.transparency_reports IS 'ECFA-aligned public transparency and annual reports';
COMMENT ON TABLE public.campaign_microsites IS 'Auto-generated campaign landing pages with narrative budgets and giving thermometers';
