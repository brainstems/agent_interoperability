-- =====================================================
-- STEWARDSHIP PLATFORM AUGMENTATION - PHASE 4
-- ML/AI Intelligence: Propensity Models & NBA
-- Created: 2025-11-02
-- =====================================================

-- =====================================================
-- 1. MEMBER PROPENSITY SCORES (FR-18)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.member_propensity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.families(id),
    -- Model metadata
    model_name TEXT NOT NULL, -- 'giving_propensity_v1', 'churn_risk_v2'
    model_version TEXT NOT NULL,
    model_type TEXT CHECK (model_type IN (
        'propensity_to_give', 'propensity_to_serve', 'propensity_to_attend',
        'churn_risk', 'capacity_tier', 'engagement_score'
    )),
    -- Scores (0-1 range)
    propensity_to_give DECIMAL(5,4) CHECK (propensity_to_give BETWEEN 0 AND 1),
    propensity_to_serve DECIMAL(5,4) CHECK (propensity_to_serve BETWEEN 0 AND 1),
    propensity_to_attend DECIMAL(5,4) CHECK (propensity_to_attend BETWEEN 0 AND 1),
    churn_risk_score DECIMAL(5,4) CHECK (churn_risk_score BETWEEN 0 AND 1),
    engagement_score DECIMAL(5,4) CHECK (engagement_score BETWEEN 0 AND 1),
    -- Giving capacity analysis
    capacity_tier TEXT CHECK (capacity_tier IN (
        'leadership_gift', 'major_gift', 'regular_gift', 'modest_gift', 'first_time'
    )),
    recommended_ask_amount DECIMAL(10,2),
    recommended_ask_range_min DECIMAL(10,2),
    recommended_ask_range_max DECIMAL(10,2),
    -- Recurring likelihood
    recurring_likelihood DECIMAL(5,4) CHECK (recurring_likelihood BETWEEN 0 AND 1),
    recommended_frequency TEXT CHECK (recommended_frequency IN (
        'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
    )),
    -- Model confidence & explainability
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    top_influencing_factors JSONB, -- [{factor: 'giving_history', importance: 0.35}, ...]
    features_used JSONB, -- Store feature values for explainability
    shap_values JSONB, -- SHAP values for detailed explanation
    -- Validity & refresh
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    -- Metadata
    campaign_id UUID REFERENCES public.campaigns(id), -- Context-specific scoring
    computation_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_propensity_church ON public.member_propensity_scores(church_id);
CREATE INDEX IF NOT EXISTS idx_propensity_member ON public.member_propensity_scores(member_id);
CREATE INDEX IF NOT EXISTS idx_propensity_active ON public.member_propensity_scores(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_propensity_give ON public.member_propensity_scores(propensity_to_give DESC);
CREATE INDEX IF NOT EXISTS idx_propensity_churn ON public.member_propensity_scores(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_propensity_capacity ON public.member_propensity_scores(capacity_tier);
CREATE INDEX IF NOT EXISTS idx_propensity_expires ON public.member_propensity_scores(expires_at);

-- =====================================================
-- 2. NEXT-BEST ACTION RECOMMENDATIONS (FR-19)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.nba_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.families(id),
    campaign_id UUID REFERENCES public.campaigns(id),
    -- Recommendation details
    action_type TEXT NOT NULL CHECK (action_type IN (
        'invite_to_serve', 'invite_to_event', 'pledge_prompt', 
        'recurring_ask', 'upgrade_ask', 'thank_you', 
        're_engagement', 'pastoral_visit', 'phone_call',
        'personal_note', 'testimony_request', 'planned_giving_discussion'
    )),
    action_priority INTEGER DEFAULT 5 CHECK (action_priority BETWEEN 1 AND 10),
    -- Communication strategy
    recommended_channel TEXT CHECK (recommended_channel IN (
        'email', 'sms', 'phone', 'in_person', 'letter', 'video_call'
    )),
    alternate_channels TEXT[],
    optimal_send_time TIMESTAMPTZ,
    optimal_day_of_week TEXT,
    optimal_time_of_day TIME,
    -- Message personalization
    recommended_subject TEXT,
    recommended_message_tone TEXT, -- 'warm', 'formal', 'casual', 'urgent'
    personalization_tokens JSONB, -- {name, last_gift_date, etc.}
    content_template_id UUID REFERENCES content_templates(id),
    -- Reasoning & explainability
    reasoning TEXT NOT NULL,
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    supporting_signals JSONB, -- Array of data points that led to recommendation
    propensity_score_id UUID REFERENCES public.member_propensity_scores(id),
    -- Status & execution
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'sent', 'completed', 
        'responded', 'declined', 'expired', 'cancelled'
    )),
    scheduled_for TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    -- Outcome tracking
    response_type TEXT CHECK (response_type IN (
        'positive', 'negative', 'neutral', 'no_response'
    )),
    conversion_occurred BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    response_notes TEXT,
    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_model TEXT -- Which model/agent generated this
);

CREATE INDEX IF NOT EXISTS idx_nba_church ON public.nba_recommendations(church_id);
CREATE INDEX IF NOT EXISTS idx_nba_member ON public.nba_recommendations(member_id);
CREATE INDEX IF NOT EXISTS idx_nba_campaign ON public.nba_recommendations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_nba_status ON public.nba_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_nba_assigned ON public.nba_recommendations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_nba_priority ON public.nba_recommendations(action_priority DESC, optimal_send_time);
CREATE INDEX IF NOT EXISTS idx_nba_expires ON public.nba_recommendations(expires_at);

-- =====================================================
-- 3. SEND-TIME OPTIMIZATION (FR-20)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.send_time_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Communication preferences learned from engagement
    email_optimal_day TEXT[], -- ['tuesday', 'thursday']
    email_optimal_hour INTEGER, -- 0-23
    sms_optimal_day TEXT[],
    sms_optimal_hour INTEGER,
    -- Engagement patterns
    typical_open_time_email TIME,
    typical_open_time_sms TIME,
    avg_time_to_open_minutes INTEGER,
    -- Device preferences
    primary_device TEXT CHECK (primary_device IN ('mobile', 'desktop', 'tablet')),
    -- Statistical analysis
    sample_size INTEGER,
    confidence_level DECIMAL(3,2),
    last_engagement_at TIMESTAMPTZ,
    -- Validity
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_send_time_member ON public.send_time_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_send_time_active ON public.send_time_profiles(is_active) WHERE is_active = true;

-- =====================================================
-- 4. ANOMALY DETECTION (FR-21)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    -- Anomaly details
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
        'unusual_donation_pattern', 'duplicate_member', 'data_quality_issue',
        'potential_fraud', 'large_variance', 'missing_data', 'outlier_behavior'
    )),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    -- Affected entities
    affected_entity_type TEXT, -- 'donation', 'member', 'pledge', 'batch'
    affected_entity_id UUID,
    member_id UUID REFERENCES public.profiles(id),
    donation_id UUID REFERENCES donations(id),
    batch_id UUID REFERENCES gift_batches(id),
    -- Anomaly description
    description TEXT NOT NULL,
    anomaly_score DECIMAL(5,4), -- How unusual is this?
    expected_value JSONB,
    actual_value JSONB,
    deviation_percentage DECIMAL(7,2),
    -- Detection
    detected_by TEXT, -- 'isolation_forest_model', 'rule_engine', 'manual_review'
    detection_model_version TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    -- Resolution
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new', 'investigating', 'confirmed', 'false_positive', 'resolved', 'ignored'
    )),
    assigned_to UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    -- Actions taken
    action_taken TEXT,
    automatic_fix_applied BOOLEAN DEFAULT false,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_church ON public.anomaly_alerts(church_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON public.anomaly_alerts(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON public.anomaly_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomaly_alerts(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_member ON public.anomaly_alerts(member_id);

-- =====================================================
-- 5. MODEL TRAINING DATA & FEATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ml_feature_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Feature set
    feature_set_name TEXT NOT NULL, -- 'giving_features_v1', 'engagement_features_v2'
    feature_set_version TEXT NOT NULL,
    features JSONB NOT NULL, -- All computed features as key-value pairs
    -- Temporal context
    as_of_date TIMESTAMPTZ NOT NULL, -- Point-in-time features
    lookback_period TEXT, -- '30days', '90days', '1year'
    -- Usage tracking
    used_for_training BOOLEAN DEFAULT false,
    used_for_inference BOOLEAN DEFAULT false,
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, feature_set_name, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_features_member ON public.ml_feature_store(member_id);
CREATE INDEX IF NOT EXISTS idx_features_set ON public.ml_feature_store(feature_set_name, feature_set_version);
CREATE INDEX IF NOT EXISTS idx_features_date ON public.ml_feature_store(as_of_date);

-- =====================================================
-- 6. MODEL PERFORMANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ml_model_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id),
    organization_id UUID REFERENCES public.organizations(id),
    -- Model identification
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    model_type TEXT NOT NULL,
    -- Performance metrics
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    auc_roc DECIMAL(5,4),
    -- Business metrics
    conversion_rate DECIMAL(5,4),
    lift_over_baseline DECIMAL(5,2),
    false_positive_rate DECIMAL(5,4),
    false_negative_rate DECIMAL(5,4),
    -- Fairness metrics
    demographic_parity_diff DECIMAL(5,4),
    equalized_odds_diff DECIMAL(5,4),
    -- Deployment info
    evaluation_dataset_size INTEGER,
    evaluation_period_start DATE,
    evaluation_period_end DATE,
    is_production_model BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_name ON public.ml_model_metrics(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_model_metrics_production ON public.ml_model_metrics(is_production_model) WHERE is_production_model = true;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.member_propensity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_time_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_feature_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model_metrics ENABLE ROW LEVEL SECURITY;

-- Propensity scores: Admin/clergy only
CREATE POLICY "Admin/clergy can view propensity scores" 
    ON public.member_propensity_scores FOR SELECT 
    TO authenticated 
    USING (
        church_id = public.get_user_church_id()
        AND public.is_admin_or_clergy()
    );

-- NBA recommendations: View if assigned or admin
CREATE POLICY "Users can view NBA recommendations" 
    ON public.nba_recommendations FOR SELECT 
    TO authenticated 
    USING (
        assigned_to = auth.uid()
        OR public.is_admin_or_clergy()
    );

-- Anomalies: Admin/clergy only
CREATE POLICY "Admin/clergy can view anomalies" 
    ON public.anomaly_alerts FOR SELECT 
    TO authenticated 
    USING (
        church_id = public.get_user_church_id()
        AND public.is_admin_or_clergy()
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get top NBA recommendations for a member
CREATE OR REPLACE FUNCTION public.get_top_nba_for_member(
    p_member_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    action_type TEXT,
    recommended_channel TEXT,
    reasoning TEXT,
    priority INTEGER,
    optimal_send_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nba.id,
        nba.action_type,
        nba.recommended_channel,
        nba.reasoning,
        nba.action_priority,
        nba.optimal_send_time
    FROM public.nba_recommendations nba
    WHERE nba.member_id = p_member_id
    AND nba.status = 'pending'
    AND nba.expires_at > NOW()
    ORDER BY nba.action_priority DESC, nba.optimal_send_time
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Refresh propensity scores (placeholder for actual ML integration)
CREATE OR REPLACE FUNCTION public.refresh_propensity_scores(
    p_church_id UUID,
    p_model_name TEXT DEFAULT 'giving_propensity_v1'
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- This would call external ML service in production
    -- For now, placeholder that marks scores as needing refresh
    UPDATE public.member_propensity_scores
    SET is_active = false
    WHERE church_id = p_church_id
    AND model_name = p_model_name
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate engagement score from multiple signals
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(p_member_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_score DECIMAL(5,4) := 0;
    v_recent_attendance INTEGER;
    v_recent_giving INTEGER;
    v_recent_serving INTEGER;
BEGIN
    -- Attendance factor (0-0.4)
    SELECT COUNT(*) INTO v_recent_attendance
    FROM event_attendance
    WHERE member_id = p_member_id
    AND attended = true
    AND event_id IN (
        SELECT id FROM events 
        WHERE start_datetime > NOW() - INTERVAL '90 days'
    );
    v_score := v_score + LEAST(v_recent_attendance * 0.05, 0.4);
    
    -- Giving factor (0-0.4)
    SELECT COUNT(*) INTO v_recent_giving
    FROM donations
    WHERE donor_id = p_member_id
    AND donation_date > CURRENT_DATE - INTERVAL '90 days';
    v_score := v_score + LEAST(v_recent_giving * 0.1, 0.4);
    
    -- Serving factor (0-0.2)
    SELECT COUNT(*) INTO v_recent_serving
    FROM volunteer_assignments
    WHERE member_id = p_member_id
    AND status = 'ACTIVE'
    AND start_date > CURRENT_DATE - INTERVAL '90 days';
    v_score := v_score + LEAST(v_recent_serving * 0.1, 0.2);
    
    RETURN LEAST(v_score, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_nba_recommendations_update_timestamp
BEFORE UPDATE ON public.nba_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_anomaly_alerts_update_timestamp
BEFORE UPDATE ON public.anomaly_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.member_propensity_scores IS 'ML-powered propensity scores for giving, serving, attendance, and churn risk';
COMMENT ON TABLE public.nba_recommendations IS 'Next-best action recommendations with channel optimization and send-time intelligence';
COMMENT ON TABLE public.send_time_profiles IS 'Learned communication preferences for optimal message timing';
COMMENT ON TABLE public.anomaly_alerts IS 'Automated detection of unusual patterns, fraud, and data quality issues';
COMMENT ON TABLE public.ml_feature_store IS 'Point-in-time feature storage for ML model training and inference';
COMMENT ON TABLE public.ml_model_metrics IS 'Model performance tracking and fairness monitoring';
