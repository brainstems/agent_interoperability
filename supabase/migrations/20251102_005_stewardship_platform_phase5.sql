-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 5
-- Consent Management & Compliance (GDPR, ECFA, PCI)
-- Created: 2025-11-02
-- =====================================================

-- =====================================================
-- 1. CONSENT MANAGEMENT (FR-31, §9)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Consent details
    consent_type TEXT NOT NULL CHECK (consent_type IN (
        'email_marketing', 'sms_marketing', 'phone_contact', 
        'data_profiling', 'ai_processing', 'data_sharing',
        'photo_usage', 'testimony_sharing', 'directory_listing',
        'third_party_sharing', 'analytics_tracking'
    )),
    consent_given BOOLEAN NOT NULL,
    -- Legal basis (GDPR Art. 6)
    legal_basis TEXT CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interest'
    )),
    legitimate_interest_explanation TEXT,
    -- Consent capture
    consent_source TEXT NOT NULL, -- 'signup_form', 'website', 'in_person', 'email', 'phone'
    consent_method TEXT, -- 'checkbox', 'opt_in', 'verbal', 'written'
    consent_text TEXT, -- Exact text shown to user
    consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_expiry_date TIMESTAMPTZ,
    -- Withdrawal tracking
    withdrawn_date TIMESTAMPTZ,
    withdrawal_reason TEXT,
    withdrawal_method TEXT,
    -- Audit trail
    ip_address INET,
    user_agent TEXT,
    consent_version TEXT, -- Version of privacy policy/terms
    recorded_by UUID REFERENCES public.profiles(id),
    -- Special category data (GDPR Art. 9)
    involves_special_category BOOLEAN DEFAULT false,
    special_category_justification TEXT,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_member ON public.consent_records(member_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON public.consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_active ON public.consent_records(consent_given, withdrawn_date);
CREATE INDEX IF NOT EXISTS idx_consent_expiry ON public.consent_records(consent_expiry_date) WHERE consent_expiry_date IS NOT NULL;

-- Privacy preferences (aggregate view)
CREATE TABLE IF NOT EXISTS public.privacy_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Opt-out flags
    opt_out_email BOOLEAN DEFAULT false,
    opt_out_sms BOOLEAN DEFAULT false,
    opt_out_phone BOOLEAN DEFAULT false,
    opt_out_mail BOOLEAN DEFAULT false,
    opt_out_profiling BOOLEAN DEFAULT false,
    opt_out_ai_processing BOOLEAN DEFAULT false,
    opt_out_benchmarking BOOLEAN DEFAULT false,
    -- Data rights
    right_to_be_forgotten_requested BOOLEAN DEFAULT false,
    right_to_portability_requested BOOLEAN DEFAULT false,
    right_to_rectification_requested BOOLEAN DEFAULT false,
    data_processing_restriction BOOLEAN DEFAULT false,
    -- Communication preferences
    preferred_channel TEXT CHECK (preferred_channel IN ('email', 'sms', 'phone', 'mail', 'none')),
    do_not_contact BOOLEAN DEFAULT false,
    contact_frequency_limit TEXT, -- 'daily', 'weekly', 'monthly'
    -- Visibility preferences
    directory_visibility TEXT DEFAULT 'church_only' CHECK (directory_visibility IN ('private', 'church_only', 'public')),
    photo_permission BOOLEAN DEFAULT true,
    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_privacy_member ON public.privacy_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_privacy_optouts ON public.privacy_preferences(opt_out_email, opt_out_sms, opt_out_phone);

-- =====================================================
-- 2. AI DECISION AUDIT LOG (FR-23, FR-31)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Decision context
    decision_type TEXT NOT NULL CHECK (decision_type IN (
        'propensity_score', 'nba_recommendation', 'send_time_optimization',
        'content_personalization', 'capacity_assessment', 'churn_prediction',
        'anomaly_detection', 'journey_enrollment', 'ask_amount_calculation'
    )),
    decision_id UUID, -- Link to specific decision record
    -- Model information
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    agent_name TEXT,
    -- Input & output
    input_features JSONB NOT NULL, -- Features used for decision
    output_decision JSONB NOT NULL, -- Decision made
    confidence_score DECIMAL(5,4),
    -- Explainability
    explanation TEXT, -- Human-readable explanation
    feature_importance JSONB, -- Which features were most important
    alternative_options JSONB, -- Other options considered
    -- Human oversight
    human_review_required BOOLEAN DEFAULT false,
    human_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    human_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    override_decision JSONB,
    -- Compliance & ethics
    bias_check_passed BOOLEAN DEFAULT true,
    fairness_score DECIMAL(5,4),
    protected_attributes_used BOOLEAN DEFAULT false,
    ethical_review_flag BOOLEAN DEFAULT false,
    -- Outcome tracking
    decision_actioned BOOLEAN DEFAULT false,
    action_outcome TEXT,
    outcome_value DECIMAL(10,2),
    -- Metadata
    decision_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_church ON public.ai_decision_log(church_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_member ON public.ai_decision_log(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_type ON public.ai_decision_log(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_log_model ON public.ai_decision_log(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_ai_log_review ON public.ai_decision_log(human_review_required) WHERE human_reviewed = false;
CREATE INDEX IF NOT EXISTS idx_ai_log_timestamp ON public.ai_decision_log(decision_timestamp);

-- =====================================================
-- 3. CONTENT APPROVAL WORKFLOW (FR-16, FR-33)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.generated_content_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id),
    journey_step_id UUID REFERENCES public.journey_steps(id),
    -- Content details
    content_type TEXT NOT NULL CHECK (content_type IN (
        'email', 'sms', 'letter', 'sermon_outline', 'testimony', 
        'thank_you_note', 'social_post', 'newsletter', 'appeal_letter'
    )),
    subject_line TEXT,
    content_body TEXT NOT NULL,
    generated_by_model TEXT,
    -- Approval workflow
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'in_review', 'approved', 'rejected', 
        'needs_revision', 'pastoral_review_required'
    )),
    approval_level TEXT DEFAULT 'staff' CHECK (approval_level IN (
        'staff', 'pastoral', 'finance', 'leadership'
    )),
    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    -- Feedback & revision
    feedback TEXT,
    revision_notes TEXT,
    revision_count INTEGER DEFAULT 0,
    edited_content TEXT, -- Final approved version if edited
    -- Theological & ethical checks
    theological_concerns TEXT[],
    financial_promise_check BOOLEAN DEFAULT false,
    tone_appropriate BOOLEAN DEFAULT true,
    factual_accuracy_verified BOOLEAN DEFAULT false,
    scripture_citations_verified BOOLEAN DEFAULT false,
    -- Approval
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    approval_notes TEXT,
    -- Publishing
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    -- Metadata
    denomination_preset TEXT,
    liturgical_context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_approval_church ON public.generated_content_approvals(church_id);
CREATE INDEX IF NOT EXISTS idx_content_approval_status ON public.generated_content_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_content_approval_assigned ON public.generated_content_approvals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_content_approval_campaign ON public.generated_content_approvals(campaign_id);

-- =====================================================
-- 4. DATA ACCESS LOG (GDPR Art. 15, 20)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    -- Access details
    accessed_by UUID NOT NULL REFERENCES public.profiles(id),
    access_type TEXT NOT NULL CHECK (access_type IN (
        'view', 'export', 'edit', 'delete', 'share', 'print'
    )),
    -- Subject of access
    subject_member_id UUID REFERENCES public.profiles(id),
    subject_household_id UUID REFERENCES public.families(id),
    data_category TEXT, -- 'financial', 'personal', 'communication', 'attendance'
    table_name TEXT,
    record_ids UUID[],
    -- Purpose & legal basis
    access_purpose TEXT NOT NULL,
    legal_basis TEXT,
    -- Access context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    -- Metadata
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_access_church ON public.data_access_log(church_id);
CREATE INDEX IF NOT EXISTS idx_data_access_user ON public.data_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_data_access_subject ON public.data_access_log(subject_member_id);
CREATE INDEX IF NOT EXISTS idx_data_access_timestamp ON public.data_access_log(accessed_at);

-- =====================================================
-- 5. PCI COMPLIANCE TOKENS
-- =====================================================

-- Payment tokens (PCI scope minimization)
CREATE TABLE IF NOT EXISTS public.payment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Tokenization
    token_id TEXT NOT NULL UNIQUE, -- From payment processor
    payment_method_type TEXT NOT NULL CHECK (payment_method_type IN (
        'credit_card', 'debit_card', 'bank_account', 'digital_wallet'
    )),
    -- Masked details (PCI-safe)
    card_last_four TEXT,
    card_brand TEXT, -- 'visa', 'mastercard', 'amex'
    card_exp_month INTEGER CHECK (card_exp_month BETWEEN 1 AND 12),
    card_exp_year INTEGER,
    bank_name TEXT,
    account_last_four TEXT,
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    -- Processor info
    processor_name TEXT NOT NULL, -- 'stripe', 'vanco', 'pushpay'
    processor_customer_id TEXT,
    -- Metadata
    billing_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_tokens_member ON public.payment_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_token ON public.payment_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_active ON public.payment_tokens(is_active) WHERE is_active = true;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tokens ENABLE ROW LEVEL SECURITY;

-- Consent: View own or if admin
CREATE POLICY "Users can view consent records" 
    ON public.consent_records FOR SELECT 
    TO authenticated 
    USING (member_id = auth.uid() OR public.is_admin_or_clergy());

-- Privacy preferences: View/edit own
CREATE POLICY "Users can manage own privacy" 
    ON public.privacy_preferences FOR ALL
    TO authenticated 
    USING (member_id = auth.uid())
    WITH CHECK (member_id = auth.uid());

-- AI log: Admin only
CREATE POLICY "Admin can view AI decisions" 
    ON public.ai_decision_log FOR SELECT 
    TO authenticated 
    USING (public.is_admin_or_clergy());

-- Content approvals: Assigned reviewers + admins
CREATE POLICY "Users can view assigned content approvals" 
    ON public.generated_content_approvals FOR SELECT 
    TO authenticated 
    USING (
        assigned_to = auth.uid()
        OR reviewed_by = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- Payment tokens: Own tokens only
CREATE POLICY "Users can view own payment tokens" 
    ON public.payment_tokens FOR SELECT 
    TO authenticated 
    USING (member_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Check if member has given consent for specific type
CREATE OR REPLACE FUNCTION public.has_consent(
    p_member_id UUID,
    p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_consent BOOLEAN;
BEGIN
    SELECT consent_given INTO v_has_consent
    FROM public.consent_records
    WHERE member_id = p_member_id
    AND consent_type = p_consent_type
    AND consent_given = true
    AND withdrawn_date IS NULL
    AND (consent_expiry_date IS NULL OR consent_expiry_date > NOW())
    ORDER BY consent_date DESC
    LIMIT 1;
    
    RETURN COALESCE(v_has_consent, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Log AI decision with audit trail
CREATE OR REPLACE FUNCTION public.log_ai_decision(
    p_church_id UUID,
    p_member_id UUID,
    p_decision_type TEXT,
    p_model_name TEXT,
    p_input_features JSONB,
    p_output_decision JSONB,
    p_explanation TEXT
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.ai_decision_log (
        church_id, member_id, decision_type, model_name,
        model_version, input_features, output_decision, explanation
    ) VALUES (
        p_church_id, p_member_id, p_decision_type, p_model_name,
        'v1.0', p_input_features, p_output_decision, p_explanation
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Log data access automatically
CREATE OR REPLACE FUNCTION log_sensitive_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when sensitive data is accessed
    INSERT INTO public.data_access_log (
        church_id, accessed_by, access_type, subject_member_id,
        table_name, access_purpose
    ) VALUES (
        NEW.church_id, auth.uid(), TG_OP, NEW.id,
        TG_TABLE_NAME, 'automated_log'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps
CREATE TRIGGER on_consent_update_timestamp
BEFORE UPDATE ON public.consent_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_content_approvals_update_timestamp
BEFORE UPDATE ON public.generated_content_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_payment_tokens_update_timestamp
BEFORE UPDATE ON public.payment_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.consent_records IS 'GDPR-compliant consent management with legal basis tracking';
COMMENT ON TABLE public.privacy_preferences IS 'Member privacy preferences and opt-out flags';
COMMENT ON TABLE public.ai_decision_log IS 'Audit trail for all AI decisions with explainability and human oversight';
COMMENT ON TABLE public.generated_content_approvals IS 'Pastoral review workflow for AI-generated content';
COMMENT ON TABLE public.data_access_log IS 'GDPR Art. 15 compliant data access audit trail';
COMMENT ON TABLE public.payment_tokens IS 'PCI-compliant tokenized payment methods';
