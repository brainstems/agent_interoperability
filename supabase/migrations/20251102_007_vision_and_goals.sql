-- =====================================================
-- VISION & GOALS MODULE
-- Phase 7: Theological Vision-Driven Stewardship
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. VISIONS & GOALS
-- =====================================================

-- Visions: Bold, theologically-grounded future state
CREATE TABLE visions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  
  -- Vision content
  title TEXT NOT NULL,
  subtitle TEXT,
  horizon TEXT CHECK (horizon IN ('6M','12M','24M','36M')) NOT NULL,
  theological_basis_markdown TEXT NOT NULL,
  narrative_markdown TEXT NOT NULL,
  one_sentence_anchor TEXT,
  
  -- Supporting materials
  scripture_references JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  small_group_guide_markdown TEXT,
  youth_summary_markdown TEXT,
  kids_summary_markdown TEXT,
  leader_toolkit_markdown TEXT,
  
  -- Media
  hero_image_url TEXT,
  video_url TEXT,
  
  -- Status & workflow
  status TEXT CHECK (status IN ('DRAFT','REVIEW','PUBLISHED','ARCHIVED')) DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_visions_church ON visions(church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_visions_status ON visions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_visions_published ON visions(published_at DESC) WHERE status = 'PUBLISHED';

-- Vision Goals: Measurable targets tied to vision
CREATE TABLE vision_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  vision_id UUID REFERENCES visions(id) ON DELETE CASCADE,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Goal definition
  goal_code TEXT NOT NULL,  -- GIVING_TOTAL, VOL_HOURS, GROUPS, PROJECT_X_DOLLARS
  name TEXT NOT NULL,
  description TEXT,
  target_numeric NUMERIC NOT NULL,
  unit TEXT NOT NULL,  -- USD, HOURS, PEOPLE, MEALS, FAMILIES
  due_date DATE,
  
  -- Progress tracking
  current_value NUMERIC DEFAULT 0,
  last_updated_at TIMESTAMPTZ,
  
  -- Analytics path
  kpi_path TEXT,  -- For semantic analytics (e.g., 'stewardship.giving.total')
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(vision_id, goal_code)
);

CREATE INDEX idx_vision_goals_vision ON vision_goals(vision_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vision_goals_code ON vision_goals(goal_code);

-- =====================================================
-- 2. PROJECTS & IMPACT
-- =====================================================

-- Projects: Tangible outcomes that campaigns fund
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  vision_id UUID REFERENCES visions(id),
  
  -- Project details
  name TEXT NOT NULL,
  description TEXT,
  project_code TEXT,
  
  -- Financial goals
  goal_cents BIGINT,
  raised_cents BIGINT DEFAULT 0,
  
  -- Impact model
  impact_unit TEXT,  -- families, students, meals, nights of shelter
  impact_per_100_dollars NUMERIC,  -- Conversion rate for calculator
  
  -- Display
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT CHECK (status IN ('PLANNED','ACTIVE','PAUSED','COMPLETED')) DEFAULT 'PLANNED',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_campaign ON projects(campaign_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_church ON projects(church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status);

-- =====================================================
-- 3. ENHANCED PLEDGES
-- =====================================================

-- Extend existing pledges table (ALTER statements)
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS vision_id UUID REFERENCES visions(id);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS fund_code TEXT;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS note TEXT;

-- Pledge Allocations: Split pledges across multiple projects
CREATE TABLE pledge_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  pledge_id UUID REFERENCES pledges(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Allocation
  amount_cents BIGINT NOT NULL,
  percentage NUMERIC,  -- Optional: track as percentage
  
  -- Tracking
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (amount_cents > 0)
);

CREATE INDEX idx_pledge_allocations_pledge ON pledge_allocations(pledge_id);
CREATE INDEX idx_pledge_allocations_project ON pledge_allocations(project_id);

-- Payment Allocations: Track which payments fulfill which pledge allocations
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  payment_id UUID REFERENCES donations(id) ON DELETE CASCADE,
  pledge_allocation_id UUID REFERENCES pledge_allocations(id),
  project_id UUID REFERENCES projects(id),
  
  -- Amount
  amount_cents BIGINT NOT NULL,
  
  -- Metadata
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (amount_cents > 0)
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_project ON payment_allocations(project_id);

-- =====================================================
-- 4. STORIES & TESTIMONIES
-- =====================================================

-- Stories: Impact updates and testimonies
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  vision_id UUID REFERENCES visions(id),
  project_id UUID REFERENCES projects(id),
  
  -- Content
  title TEXT NOT NULL,
  subtitle TEXT,
  body_markdown TEXT NOT NULL,
  excerpt TEXT,
  
  -- Media
  featured_image_url TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('IMAGE','VIDEO','AUDIO')),
  
  -- Classification
  story_type TEXT CHECK (story_type IN ('TESTIMONY','UPDATE','MILESTONE','BENEFICIARY','IMPACT','CELEBRATION')) DEFAULT 'UPDATE',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Impact data
  impact_metrics JSONB DEFAULT '{}'::jsonb,  -- {families_helped: 12, meals_served: 450}
  
  -- Display
  featured BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  
  -- Status
  status TEXT CHECK (status IN ('DRAFT','REVIEW','PUBLISHED','ARCHIVED')) DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  
  -- Author
  author_id UUID REFERENCES profiles(id),
  author_name TEXT,  -- For external/beneficiary authors
  
  -- Consent
  consent_obtained BOOLEAN DEFAULT FALSE,
  consent_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stories_church ON stories(church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_campaign ON stories(campaign_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_published ON stories(published_at DESC) WHERE status = 'PUBLISHED';
CREATE INDEX idx_stories_featured ON stories(featured, display_order) WHERE status = 'PUBLISHED';

-- =====================================================
-- 5. SEGMENTS & COMMUNICATION
-- =====================================================

-- Segments: Member groupings based on behavior/attributes
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Segment definition
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,  -- Rules DSL
  
  -- Computed members (cached)
  member_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  
  -- Configuration
  is_dynamic BOOLEAN DEFAULT TRUE,  -- Re-compute vs. static
  refresh_frequency TEXT CHECK (refresh_frequency IN ('REALTIME','HOURLY','DAILY','WEEKLY','MANUAL')),
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_segments_church ON segments(church_id) WHERE deleted_at IS NULL;

-- Segment Members: Cached membership for performance
CREATE TABLE segment_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Qualification
  added_at TIMESTAMPTZ DEFAULT NOW(),
  qualification_score NUMERIC,  -- How well they match criteria
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(segment_id, member_id)
);

CREATE INDEX idx_segment_members_segment ON segment_members(segment_id);
CREATE INDEX idx_segment_members_member ON segment_members(member_id);

-- Communication Sequences: Multi-step campaigns
CREATE TABLE comm_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  vision_id UUID REFERENCES visions(id),
  
  -- Sequence definition
  name TEXT NOT NULL,
  description TEXT,
  sequence_type TEXT CHECK (sequence_type IN ('VISION_LAUNCH','EDUCATION','DECISION','FOLLOWUP','THANKYOU','MILESTONE')) DEFAULT 'EDUCATION',
  
  -- Schedule configuration
  schedule JSONB NOT NULL,  -- Array of steps with timing/triggers
  
  -- Status
  status TEXT CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED')) DEFAULT 'DRAFT',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comm_sequences_church ON comm_sequences(church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comm_sequences_campaign ON comm_sequences(campaign_id);
CREATE INDEX idx_comm_sequences_status ON comm_sequences(status);

-- Sequence Executions: Track who received what
CREATE TABLE sequence_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES comm_sequences(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id),
  
  -- Progress
  current_step INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('ENROLLED','IN_PROGRESS','COMPLETED','OPTED_OUT','FAILED')) DEFAULT 'ENROLLED',
  
  -- Timing
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Tracking
  steps_completed INTEGER DEFAULT 0,
  steps_opened INTEGER DEFAULT 0,
  steps_clicked INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, member_id)
);

CREATE INDEX idx_sequence_executions_sequence ON sequence_executions(sequence_id);
CREATE INDEX idx_sequence_executions_member ON sequence_executions(member_id);
CREATE INDEX idx_sequence_executions_status ON sequence_executions(status);

-- =====================================================
-- 6. MILESTONES & CELEBRATIONS
-- =====================================================

-- Campaign Milestones: Trackable achievements
CREATE TABLE campaign_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  vision_goal_id UUID REFERENCES vision_goals(id),
  
  -- Milestone definition
  name TEXT NOT NULL,
  milestone_type TEXT CHECK (milestone_type IN ('PERCENTAGE','AMOUNT','DATE','CUSTOM')) DEFAULT 'PERCENTAGE',
  threshold_value NUMERIC NOT NULL,  -- 25, 50, 75, 100 for percentages; amounts for dollars
  
  -- Status
  is_reached BOOLEAN DEFAULT FALSE,
  reached_at TIMESTAMPTZ,
  
  -- Celebration
  celebration_message TEXT,
  celebration_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_milestones_campaign ON campaign_milestones(campaign_id);
CREATE INDEX idx_campaign_milestones_reached ON campaign_milestones(is_reached, reached_at);

-- =====================================================
-- 7. IMPACT RECEIPTS
-- =====================================================

-- Impact Receipts: Personalized outcome reports
CREATE TABLE impact_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  receipt_type TEXT CHECK (receipt_type IN ('QUARTERLY','ANNUAL','CAMPAIGN')) DEFAULT 'QUARTERLY',
  
  -- Summary
  total_given_cents BIGINT NOT NULL,
  projects_supported JSONB DEFAULT '[]'::jsonb,
  impact_summary JSONB DEFAULT '{}'::jsonb,  -- Computed outcomes
  
  -- Stories
  story_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Delivery
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impact_receipts_member ON impact_receipts(member_id);
CREATE INDEX idx_impact_receipts_period ON impact_receipts(period_end DESC);

-- =====================================================
-- 8. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update vision goal progress
CREATE OR REPLACE FUNCTION update_vision_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update based on goal type
  IF EXISTS (
    SELECT 1 FROM vision_goals 
    WHERE id = NEW.vision_goal_id 
    AND goal_code LIKE 'GIVING_%'
  ) THEN
    UPDATE vision_goals
    SET 
      current_value = (
        SELECT COALESCE(SUM(amount), 0)
        FROM donations
        WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE vision_id = vision_goals.vision_id
        )
      ),
      last_updated_at = NOW()
    WHERE id = NEW.vision_goal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update project raised amount
CREATE OR REPLACE FUNCTION update_project_raised()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET 
    raised_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM payment_allocations
      WHERE project_id = projects.id
    ),
    updated_at = NOW()
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_project_raised
AFTER INSERT OR UPDATE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_project_raised();

-- Check milestone achievement
CREATE OR REPLACE FUNCTION check_campaign_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_milestone RECORD;
  v_progress NUMERIC;
BEGIN
  -- Calculate campaign progress
  FOR v_milestone IN 
    SELECT * FROM campaign_milestones 
    WHERE campaign_id = NEW.id 
    AND is_reached = FALSE
  LOOP
    IF v_milestone.milestone_type = 'PERCENTAGE' THEN
      v_progress := (NEW.amount_raised::NUMERIC / NULLIF(NEW.goal_amount, 0)) * 100;
      
      IF v_progress >= v_milestone.threshold_value THEN
        UPDATE campaign_milestones
        SET 
          is_reached = TRUE,
          reached_at = NOW()
        WHERE id = v_milestone.id;
        
        -- Emit event for celebration (handled by application)
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visions_updated_at BEFORE UPDATE ON visions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_vision_goals_updated_at BEFORE UPDATE ON vision_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_stories_updated_at BEFORE UPDATE ON stories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_receipts ENABLE ROW LEVEL SECURITY;

-- Vision policies
CREATE POLICY vision_select ON visions FOR SELECT
  USING (
    church_id = current_setting('app.current_church_id')::UUID
    OR status = 'PUBLISHED'
  );

CREATE POLICY vision_insert ON visions FOR INSERT
  WITH CHECK (
    church_id = current_setting('app.current_church_id')::UUID
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN','CLERGY','STAFF')
    )
  );

-- Project policies (public for published campaigns)
CREATE POLICY project_select ON projects FOR SELECT
  USING (
    church_id = current_setting('app.current_church_id')::UUID
    OR status = 'ACTIVE'
  );

-- Story policies
CREATE POLICY story_select ON stories FOR SELECT
  USING (
    church_id = current_setting('app.current_church_id')::UUID
    OR (status = 'PUBLISHED' AND deleted_at IS NULL)
  );

-- Member receipts (own only)
CREATE POLICY receipt_select ON impact_receipts FOR SELECT
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN','CLERGY','STAFF')
    )
  );

-- =====================================================
-- 10. VIEWS FOR ANALYTICS
-- =====================================================

-- Campaign progress view
CREATE OR REPLACE VIEW v_campaign_progress AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.vision_id,
  v.title AS vision_title,
  COUNT(DISTINCT p.id) AS pledge_count,
  COUNT(DISTINCT p.member_id) AS unique_pledgers,
  COALESCE(SUM(pa.amount_cents), 0) AS raised_cents,
  c.goal_amount AS goal_cents,
  ROUND((COALESCE(SUM(pa.amount_cents), 0)::NUMERIC / NULLIF(c.goal_amount, 0)) * 100, 2) AS progress_percentage,
  COUNT(DISTINCT proj.id) AS project_count,
  COUNT(DISTINCT s.id) AS story_count,
  c.start_date,
  c.end_date,
  c.status
FROM campaigns c
LEFT JOIN visions v ON c.vision_id = v.id
LEFT JOIN pledges p ON c.id = p.campaign_id
LEFT JOIN pledge_allocations pa ON p.id = pa.pledge_id
LEFT JOIN projects proj ON c.id = proj.campaign_id
LEFT JOIN stories s ON c.id = s.campaign_id AND s.status = 'PUBLISHED'
GROUP BY c.id, c.name, c.vision_id, v.title, c.goal_amount, c.start_date, c.end_date, c.status;

-- Project impact view
CREATE OR REPLACE VIEW v_project_impact AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.campaign_id,
  p.goal_cents,
  p.raised_cents,
  ROUND((p.raised_cents::NUMERIC / NULLIF(p.goal_cents, 0)) * 100, 2) AS progress_percentage,
  p.impact_unit,
  p.impact_per_100_dollars,
  ROUND((p.raised_cents / 100.0) * p.impact_per_100_dollars, 2) AS computed_impact,
  COUNT(DISTINCT pa.pledge_id) AS supporter_count,
  p.status
FROM projects p
LEFT JOIN pledge_allocations pa ON p.id = pa.project_id
GROUP BY p.id, p.name, p.campaign_id, p.goal_cents, p.raised_cents, 
         p.impact_unit, p.impact_per_100_dollars, p.status;

-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_campaigns_vision ON campaigns(vision_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pledge_allocations_amounts ON pledge_allocations(project_id, amount_cents);
CREATE INDEX idx_payment_allocations_amounts ON payment_allocations(project_id, amount_cents);
CREATE INDEX idx_stories_campaign_published ON stories(campaign_id, published_at DESC) 
  WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE visions IS 'Theological vision statements with goals and supporting materials';
COMMENT ON TABLE vision_goals IS 'Measurable targets tied to visions (giving, volunteering, growth)';
COMMENT ON TABLE projects IS 'Tangible outcomes funded by campaigns with impact models';
COMMENT ON TABLE stories IS 'Impact updates, testimonies, and celebration stories';
COMMENT ON TABLE segments IS 'Member segments for targeted communication';
COMMENT ON TABLE comm_sequences IS 'Multi-step communication campaigns';
COMMENT ON TABLE impact_receipts IS 'Personalized quarterly/annual impact reports';
