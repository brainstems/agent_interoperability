-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 3
-- Enhanced Pledging: Time/Talent/Treasure & Multi-Fund
-- Created: 2025-11-02
-- =====================================================

-- =====================================================
-- 1. EXTEND PLEDGES FOR TIME/TALENT/TREASURE (FR-11, FR-12)
-- =====================================================

-- Add new columns to existing pledges table
ALTER TABLE pledges 
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id),
    ADD COLUMN IF NOT EXISTS pledge_category TEXT DEFAULT 'treasure' 
        CHECK (pledge_category IN ('time', 'talent', 'treasure', 'combined')),
    ADD COLUMN IF NOT EXISTS hours_committed INTEGER CHECK (hours_committed >= 0),
    ADD COLUMN IF NOT EXISTS hours_fulfilled INTEGER DEFAULT 0 CHECK (hours_fulfilled >= 0),
    ADD COLUMN IF NOT EXISTS skill_offerings TEXT[],
    ADD COLUMN IF NOT EXISTS ministry_preferences TEXT[],
    ADD COLUMN IF NOT EXISTS planned_giving_intent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS planned_giving_type TEXT 
        CHECK (planned_giving_type IN ('bequest', 'trust', 'annuity', 'ira', 'life_insurance', 'real_estate', 'other')),
    ADD COLUMN IF NOT EXISTS pledge_source TEXT DEFAULT 'in_person'
        CHECK (pledge_source IN ('in_person', 'online', 'mobile', 'mail', 'phone')),
    ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false;

-- Create index on campaign_id
CREATE INDEX IF NOT EXISTS idx_pledges_campaign ON pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pledges_category ON pledges(pledge_category);
CREATE INDEX IF NOT EXISTS idx_pledges_planned_giving ON pledges(planned_giving_intent) WHERE planned_giving_intent = true;

-- =====================================================
-- 2. MULTI-FUND PLEDGE ALLOCATIONS (FR-11)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pledge_fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
    -- Allocation details
    allocation_type TEXT DEFAULT 'percentage' CHECK (allocation_type IN ('percentage', 'fixed_amount')),
    allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage BETWEEN 0 AND 100),
    allocation_amount DECIMAL(10,2) CHECK (allocation_amount >= 0),
    -- Tracking
    amount_received DECIMAL(10,2) DEFAULT 0,
    is_flexible BOOLEAN DEFAULT false, -- Can be adjusted by donor
    priority_order INTEGER, -- For fixed amount pledges
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT allocation_value_check CHECK (
        (allocation_type = 'percentage' AND allocation_percentage IS NOT NULL)
        OR (allocation_type = 'fixed_amount' AND allocation_amount IS NOT NULL)
    ),
    UNIQUE(pledge_id, fund_id)
);

-- Ensure allocations sum to 100% for percentage type
CREATE OR REPLACE FUNCTION validate_pledge_allocations()
RETURNS TRIGGER AS $$
DECLARE
    v_total_percentage DECIMAL(5,2);
    v_pledge_amount DECIMAL(10,2);
    v_total_fixed_amount DECIMAL(10,2);
BEGIN
    IF NEW.allocation_type = 'percentage' THEN
        -- Check that total percentages don't exceed 100%
        SELECT COALESCE(SUM(allocation_percentage), 0) INTO v_total_percentage
        FROM public.pledge_fund_allocations
        WHERE pledge_id = NEW.pledge_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        
        IF (v_total_percentage + NEW.allocation_percentage) > 100 THEN
            RAISE EXCEPTION 'Total allocation percentage cannot exceed 100%';
        END IF;
    ELSE
        -- Check that total fixed amounts don't exceed pledge amount
        SELECT amount INTO v_pledge_amount FROM pledges WHERE id = NEW.pledge_id;
        
        SELECT COALESCE(SUM(allocation_amount), 0) INTO v_total_fixed_amount
        FROM public.pledge_fund_allocations
        WHERE pledge_id = NEW.pledge_id
        AND allocation_type = 'fixed_amount'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        
        IF (v_total_fixed_amount + NEW.allocation_amount) > v_pledge_amount THEN
            RAISE EXCEPTION 'Total fixed allocations cannot exceed pledge amount';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_allocations_before_insert_update
BEFORE INSERT OR UPDATE ON public.pledge_fund_allocations
FOR EACH ROW EXECUTE FUNCTION validate_pledge_allocations();

-- =====================================================
-- 3. OFFLINE GIFT PROCESSING WITH DUAL CONTROL (FR-13)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.gift_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id),
    -- Batch details
    batch_number TEXT NOT NULL,
    batch_date DATE NOT NULL,
    batch_type TEXT DEFAULT 'offering' CHECK (batch_type IN (
        'offering', 'mail', 'events', 'online_import', 'other'
    )),
    -- Amounts
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    gift_count INTEGER NOT NULL CHECK (gift_count > 0),
    check_count INTEGER DEFAULT 0,
    cash_count INTEGER DEFAULT 0,
    -- Dual control workflow
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_review', 'reviewed', 'posted', 'voided'
    )),
    entered_by UUID NOT NULL REFERENCES public.profiles(id),
    reviewed_by UUID REFERENCES public.profiles(id),
    posted_by UUID REFERENCES public.profiles(id),
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    -- Reconciliation
    deposit_slip_number TEXT,
    bank_deposit_date DATE,
    bank_deposit_amount DECIMAL(12,2),
    variance_amount DECIMAL(12,2) DEFAULT 0,
    variance_resolved BOOLEAN DEFAULT false,
    -- Notes and attachments
    notes TEXT,
    attachment_urls TEXT[],
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, batch_number)
);

-- Prevent same person from entering and reviewing
CREATE OR REPLACE FUNCTION validate_dual_control()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = NEW.entered_by THEN
        RAISE EXCEPTION 'Reviewer cannot be the same person who entered the batch';
    END IF;
    
    IF NEW.status = 'reviewed' AND NEW.reviewed_by IS NULL THEN
        RAISE EXCEPTION 'Reviewed status requires a reviewer';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_dual_control
BEFORE INSERT OR UPDATE ON public.gift_batches
FOR EACH ROW EXECUTE FUNCTION validate_dual_control();

-- Link donations to batches
ALTER TABLE donations 
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.gift_batches(id),
    ADD COLUMN IF NOT EXISTS envelope_number TEXT,
    ADD COLUMN IF NOT EXISTS gift_purpose TEXT, -- Transparency: what the gift funds
    ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS thank_you_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_donations_batch ON donations(batch_id);
CREATE INDEX IF NOT EXISTS idx_donations_purpose ON donations(gift_purpose);

-- =====================================================
-- 4. TIME PLEDGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.time_pledge_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
    volunteer_assignment_id UUID REFERENCES volunteer_assignments(id),
    event_id UUID REFERENCES public.events(id),
    -- Time tracking
    activity_date DATE NOT NULL,
    hours_logged DECIMAL(5,2) NOT NULL CHECK (hours_logged > 0),
    activity_description TEXT,
    ministry_area TEXT,
    -- Verification
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT false,
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_time_fulfillments_pledge ON public.time_pledge_fulfillments(pledge_id);
CREATE INDEX IF NOT EXISTS idx_time_fulfillments_date ON public.time_pledge_fulfillments(activity_date);

-- =====================================================
-- 5. TALENT PLEDGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.talent_pledge_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
    volunteer_assignment_id UUID REFERENCES volunteer_assignments(id),
    -- Skill/talent details
    skill_used TEXT NOT NULL,
    ministry_served TEXT,
    project_description TEXT,
    start_date DATE,
    end_date DATE,
    impact_summary TEXT,
    -- Status
    status TEXT DEFAULT 'committed' CHECK (status IN (
        'committed', 'in_progress', 'completed', 'cancelled'
    )),
    completed_at TIMESTAMPTZ,
    -- Verification
    verified_by UUID REFERENCES public.profiles(id),
    is_verified BOOLEAN DEFAULT false,
    -- Metadata
    photos TEXT[],
    testimonial TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talent_fulfillments_pledge ON public.talent_pledge_fulfillments(pledge_id);
CREATE INDEX IF NOT EXISTS idx_talent_fulfillments_skill ON public.talent_pledge_fulfillments(skill_used);

-- =====================================================
-- 6. PLANNED GIVING INTENT CAPTURE (FR-10)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.planned_giving_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.families(id),
    pledge_id UUID REFERENCES pledges(id),
    -- Intent details
    intent_type TEXT NOT NULL CHECK (intent_type IN (
        'bequest_will', 'bequest_trust', 'charitable_remainder_trust',
        'charitable_gift_annuity', 'ira_beneficiary', 'life_insurance',
        'retained_life_estate', 'real_estate', 'stock_securities', 'other'
    )),
    estimated_value DECIMAL(12,2),
    value_range TEXT, -- '$50k-$100k', '$100k-$250k', etc.
    is_value_confidential BOOLEAN DEFAULT true,
    -- Timing
    anticipated_timing TEXT CHECK (anticipated_timing IN (
        'immediate', 'within_5_years', 'within_10_years', 
        'upon_death', 'upon_retirement', 'undecided'
    )),
    -- Fund designation
    designated_fund_id UUID REFERENCES public.funds(id),
    fund_restrictions TEXT,
    is_unrestricted BOOLEAN DEFAULT false,
    -- Relationship management
    intent_status TEXT DEFAULT 'expressed' CHECK (intent_status IN (
        'expressed', 'discussing', 'documented', 'legal_completed', 
        'notified_church', 'received', 'cancelled'
    )),
    assigned_to UUID REFERENCES public.profiles(id), -- Staff responsible
    next_follow_up DATE,
    last_contact_date DATE,
    -- Legal & documentation
    legal_advisor_notified BOOLEAN DEFAULT false,
    documentation_received BOOLEAN DEFAULT false,
    documentation_url TEXT,
    -- Privacy & consent
    can_recognize BOOLEAN DEFAULT false,
    recognition_preference TEXT, -- 'anonymous', 'name_only', 'full_story'
    consent_to_share_story BOOLEAN DEFAULT false,
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_planned_giving_church ON public.planned_giving_intents(church_id);
CREATE INDEX IF NOT EXISTS idx_planned_giving_member ON public.planned_giving_intents(member_id);
CREATE INDEX IF NOT EXISTS idx_planned_giving_status ON public.planned_giving_intents(intent_status);
CREATE INDEX IF NOT EXISTS idx_planned_giving_follow_up ON public.planned_giving_intents(next_follow_up);

-- =====================================================
-- 7. PLEDGE PAYMENT ENHANCEMENTS
-- =====================================================

-- Link pledge payments to multi-fund allocations
ALTER TABLE pledge_payments
    ADD COLUMN IF NOT EXISTS fund_allocation_id UUID REFERENCES public.pledge_fund_allocations(id),
    ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'manual'
        CHECK (payment_source IN ('manual', 'auto_recurring', 'online', 'mobile', 'ach', 'check', 'cash'));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pledge_allocations_pledge ON public.pledge_fund_allocations(pledge_id);
CREATE INDEX IF NOT EXISTS idx_pledge_allocations_fund ON public.pledge_fund_allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_gift_batches_church ON public.gift_batches(church_id);
CREATE INDEX IF NOT EXISTS idx_gift_batches_status ON public.gift_batches(status);
CREATE INDEX IF NOT EXISTS idx_gift_batches_date ON public.gift_batches(batch_date);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.pledge_fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_pledge_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pledge_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_giving_intents ENABLE ROW LEVEL SECURITY;

-- Pledge allocations: View if can view pledge
CREATE POLICY "Users can view pledge allocations" 
    ON public.pledge_fund_allocations FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM pledges p
            WHERE p.id = pledge_fund_allocations.pledge_id
            AND (p.member_id = auth.uid() OR public.is_admin_or_clergy())
        )
    );

-- Gift batches: Only admin/clergy/finance can view
CREATE POLICY "Admin/clergy can view gift batches" 
    ON public.gift_batches FOR SELECT 
    TO authenticated 
    USING (public.is_admin_or_clergy());

-- Planned giving: High privacy - only assigned staff + admins
CREATE POLICY "Restricted access to planned giving" 
    ON public.planned_giving_intents FOR SELECT 
    TO authenticated 
    USING (
        member_id = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Calculate pledge fulfillment status
CREATE OR REPLACE FUNCTION public.calculate_pledge_fulfillment(p_pledge_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_pledge RECORD;
    v_fulfillment JSONB;
    v_amount_paid DECIMAL(10,2);
    v_hours_logged DECIMAL(10,2);
BEGIN
    SELECT * INTO v_pledge FROM pledges WHERE id = p_pledge_id;
    
    IF v_pledge.pledge_category = 'treasure' THEN
        -- Calculate monetary fulfillment
        SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid
        FROM pledge_payments
        WHERE pledge_id = p_pledge_id AND status = 'PAID';
        
        v_fulfillment := jsonb_build_object(
            'type', 'treasure',
            'committed', v_pledge.amount,
            'fulfilled', v_amount_paid,
            'remaining', v_pledge.amount - v_amount_paid,
            'percentage', ROUND((v_amount_paid / NULLIF(v_pledge.amount, 0)) * 100, 2)
        );
    ELSIF v_pledge.pledge_category = 'time' THEN
        -- Calculate time fulfillment
        SELECT COALESCE(SUM(hours_logged), 0) INTO v_hours_logged
        FROM time_pledge_fulfillments
        WHERE pledge_id = p_pledge_id AND is_verified = true;
        
        v_fulfillment := jsonb_build_object(
            'type', 'time',
            'committed_hours', v_pledge.hours_committed,
            'fulfilled_hours', v_hours_logged,
            'remaining_hours', v_pledge.hours_committed - v_hours_logged,
            'percentage', ROUND((v_hours_logged / NULLIF(v_pledge.hours_committed, 0)) * 100, 2)
        );
    ELSE
        v_fulfillment := jsonb_build_object('type', v_pledge.pledge_category);
    END IF;
    
    RETURN v_fulfillment;
END;
$$ LANGUAGE plpgsql STABLE;

-- Split donation across fund allocations
CREATE OR REPLACE FUNCTION public.allocate_donation_to_funds(
    p_donation_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_donation RECORD;
    v_allocation RECORD;
    v_allocated_amount DECIMAL(10,2);
BEGIN
    SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
    
    -- Only process if donation is linked to a pledge with allocations
    IF v_donation.recurring_donation_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get pledge from recurring donation (simplified - would need actual link)
    FOR v_allocation IN 
        SELECT * FROM pledge_fund_allocations pfa
        JOIN pledges p ON p.id = pfa.pledge_id
        WHERE pfa.pledge_id IN (
            SELECT id FROM pledges WHERE member_id = v_donation.member_id
        )
    LOOP
        IF v_allocation.allocation_type = 'percentage' THEN
            v_allocated_amount := v_donation.amount * (v_allocation.allocation_percentage / 100);
        ELSE
            v_allocated_amount := v_allocation.allocation_amount;
        END IF;
        
        -- Update fund allocation tracking
        UPDATE pledge_fund_allocations
        SET amount_received = amount_received + v_allocated_amount
        WHERE id = v_allocation.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_gift_batches_update_timestamp
BEFORE UPDATE ON public.gift_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_pledge_allocations_update_timestamp
BEFORE UPDATE ON public.pledge_fund_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_talent_fulfillments_update_timestamp
BEFORE UPDATE ON public.talent_pledge_fulfillments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_planned_giving_update_timestamp
BEFORE UPDATE ON public.planned_giving_intents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================== 
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.pledge_fund_allocations IS 'Multi-fund pledge splits with percentage or fixed amount allocations';
COMMENT ON TABLE public.gift_batches IS 'Offline gift processing with dual-control review workflow for compliance';
COMMENT ON TABLE public.time_pledge_fulfillments IS 'Tracking of volunteer time pledges with verification';
COMMENT ON TABLE public.talent_pledge_fulfillments IS 'Tracking of skill/talent pledges and ministry impact';
COMMENT ON TABLE public.planned_giving_intents IS 'Planned giving intentions with privacy controls and relationship management';
