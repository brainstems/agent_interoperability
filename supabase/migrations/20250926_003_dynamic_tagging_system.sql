-- DYNAMIC TAGGING SYSTEM MIGRATION
-- Created: 2025-09-26
-- Purpose: Flexible tagging and automated group assignment system

-- Tag Types and Categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_type') THEN
        CREATE TYPE tag_type AS ENUM ('MANUAL', 'AUTOMATIC', 'COMPUTED', 'SYSTEM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_color') THEN
        CREATE TYPE tag_color AS ENUM ('RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'GRAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_operator') THEN
        CREATE TYPE rule_operator AS ENUM ('AND', 'OR', 'NOT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condition_type') THEN
        CREATE TYPE condition_type AS ENUM (
            'FIELD_EQUALS', 'FIELD_NOT_EQUALS', 'FIELD_CONTAINS', 'FIELD_NOT_CONTAINS',
            'FIELD_GREATER_THAN', 'FIELD_LESS_THAN', 'FIELD_BETWEEN',
            'DATE_BEFORE', 'DATE_AFTER', 'DATE_BETWEEN',
            'HAS_TAG', 'NOT_HAS_TAG', 'IN_GROUP', 'NOT_IN_GROUP',
            'ATTENDANCE_COUNT', 'DONATION_AMOUNT', 'LAST_ACTIVITY',
            'CUSTOM_FIELD', 'SQL_QUERY'
        );
    END IF;
END $$;

-- Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Tag Identity
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- For organizing tags
    
    -- Tag Configuration
    tag_type tag_type DEFAULT 'MANUAL',
    color tag_color DEFAULT 'BLUE',
    icon TEXT, -- Icon name or emoji
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true, -- Visible to all users
    
    -- Automatic Tag Configuration
    auto_assign BOOLEAN DEFAULT false,
    auto_remove BOOLEAN DEFAULT false,
    rule_config JSONB, -- Configuration for automatic assignment rules
    
    -- Usage Statistics
    member_count INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Permissions
    view_roles TEXT[] DEFAULT '{"ADMIN", "CLERGY", "STAFF", "VOLUNTEER"}',
    assign_roles TEXT[] DEFAULT '{"ADMIN", "CLERGY", "STAFF"}',
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(church_id, name)
);

-- Member Tags (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS public.member_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_reason TEXT,
    is_automatic BOOLEAN DEFAULT false,
    
    -- Expiration (for temporary tags)
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    UNIQUE(profile_id, tag_id)
);

-- Tag Rules for Automatic Assignment
CREATE TABLE IF NOT EXISTS public.tag_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    
    -- Rule Identity
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Rule Logic
    rule_operator rule_operator DEFAULT 'AND',
    conditions JSONB NOT NULL, -- Array of conditions
    
    -- Execution Configuration
    run_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'manual'
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    
    -- Performance Tracking
    execution_count INTEGER DEFAULT 0,
    last_execution_time_ms INTEGER,
    affected_members_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag Rule Conditions (for complex rule building)
CREATE TABLE IF NOT EXISTS public.tag_rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.tag_rules(id) ON DELETE CASCADE,
    
    -- Condition Configuration
    condition_type condition_type NOT NULL,
    field_name TEXT, -- Field to check (e.g., 'member_status', 'birth_date')
    field_scope TEXT, -- 'profile', 'custom_field', 'donation', 'attendance', etc.
    
    -- Condition Values
    value_text TEXT,
    value_number DECIMAL,
    value_date DATE,
    value_boolean BOOLEAN,
    value_array JSONB, -- For multiple values
    
    -- Condition Logic
    operator TEXT, -- 'equals', 'contains', 'greater_than', etc.
    is_negated BOOLEAN DEFAULT false,
    
    -- Grouping
    condition_group INTEGER DEFAULT 1,
    group_operator rule_operator DEFAULT 'AND',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Lists (Dynamic Groups based on tags and rules)
CREATE TABLE IF NOT EXISTS public.smart_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- List Identity
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    
    -- List Configuration
    refresh_frequency TEXT DEFAULT 'daily', -- How often to recalculate
    max_members INTEGER, -- Optional limit
    
    -- Rule Configuration
    tag_rules JSONB, -- Rules based on tags
    field_rules JSONB, -- Rules based on profile fields
    custom_sql TEXT, -- Advanced SQL-based rules
    
    -- Cache and Performance
    member_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    calculation_time_ms INTEGER,
    
    -- Permissions
    view_roles TEXT[] DEFAULT '{"ADMIN", "CLERGY", "STAFF"}',
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(church_id, name)
);

-- Smart List Members (Cached results)
CREATE TABLE IF NOT EXISTS public.smart_list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    smart_list_id UUID NOT NULL REFERENCES public.smart_lists(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Calculation Details
    added_at TIMESTAMPTZ DEFAULT NOW(),
    match_score DECIMAL, -- How well the member matches the criteria
    match_reasons TEXT[], -- Why this member was included
    
    UNIQUE(smart_list_id, profile_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tags_church_id ON public.tags(church_id);
CREATE INDEX IF NOT EXISTS idx_tags_type ON public.tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_active ON public.tags(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_member_tags_profile ON public.member_tags(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_tag ON public.member_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_church ON public.member_tags(church_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_automatic ON public.member_tags(is_automatic);

CREATE INDEX IF NOT EXISTS idx_tag_rules_tag ON public.tag_rules(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_active ON public.tag_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tag_rules_next_run ON public.tag_rules(next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_smart_lists_church ON public.smart_lists(church_id);
CREATE INDEX IF NOT EXISTS idx_smart_lists_active ON public.smart_lists(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_smart_list_members_list ON public.smart_list_members(smart_list_id);
CREATE INDEX IF NOT EXISTS idx_smart_list_members_profile ON public.smart_list_members(profile_id);

-- RLS Policies
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_list_members ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Users can view tags in their church" ON public.tags 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id());

CREATE POLICY "Admin and clergy can manage tags" ON public.tags 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

-- Member tags policies
CREATE POLICY "Users can view member tags in their church" ON public.member_tags 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id());

CREATE POLICY "Staff can manage member tags" ON public.member_tags 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'CLERGY', 'STAFF')
    ))
    WITH CHECK (church_id = public.get_user_church_id());

-- Tag rules policies
CREATE POLICY "Admin and clergy can manage tag rules" ON public.tag_rules 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Admin and clergy can manage rule conditions" ON public.tag_rule_conditions 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

-- Smart lists policies
CREATE POLICY "Users can view smart lists in their church" ON public.smart_lists 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id());

CREATE POLICY "Admin and clergy can manage smart lists" ON public.smart_lists 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Users can view smart list members" ON public.smart_list_members 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id());

-- Tag Management Functions

-- Function to assign tag to member
CREATE OR REPLACE FUNCTION public.assign_tag_to_member(
    p_church_id UUID,
    p_profile_id UUID,
    p_tag_id UUID,
    p_assigned_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_is_automatic BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
BEGIN
    -- Insert or update tag assignment
    INSERT INTO public.member_tags (
        church_id, profile_id, tag_id, assigned_by, assigned_reason, is_automatic
    ) VALUES (
        p_church_id, p_profile_id, p_tag_id, p_assigned_by, p_reason, p_is_automatic
    )
    ON CONFLICT (profile_id, tag_id) 
    DO UPDATE SET
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        assigned_reason = p_reason,
        is_automatic = p_is_automatic;
    
    -- Update tag member count
    UPDATE public.tags 
    SET 
        member_count = (
            SELECT COUNT(*) FROM public.member_tags 
            WHERE tag_id = p_tag_id
        ),
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = p_tag_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove tag from member
CREATE OR REPLACE FUNCTION public.remove_tag_from_member(
    p_profile_id UUID,
    p_tag_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.member_tags 
    WHERE profile_id = p_profile_id AND tag_id = p_tag_id;
    
    -- Update tag member count
    UPDATE public.tags 
    SET member_count = (
        SELECT COUNT(*) FROM public.member_tags 
        WHERE tag_id = p_tag_id
    )
    WHERE id = p_tag_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to evaluate tag rule condition
CREATE OR REPLACE FUNCTION public.evaluate_tag_condition(
    p_church_id UUID,
    p_profile_id UUID,
    p_condition JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    condition_type TEXT;
    field_name TEXT;
    field_scope TEXT;
    operator TEXT;
    value_text TEXT;
    value_number DECIMAL;
    value_date DATE;
    value_boolean BOOLEAN;
    is_negated BOOLEAN;
    result BOOLEAN := false;
    profile_record RECORD;
    custom_value TEXT;
BEGIN
    -- Extract condition parameters
    condition_type := p_condition->>'condition_type';
    field_name := p_condition->>'field_name';
    field_scope := p_condition->>'field_scope';
    operator := p_condition->>'operator';
    value_text := p_condition->>'value_text';
    value_number := (p_condition->>'value_number')::DECIMAL;
    value_date := (p_condition->>'value_date')::DATE;
    value_boolean := (p_condition->>'value_boolean')::BOOLEAN;
    is_negated := COALESCE((p_condition->>'is_negated')::BOOLEAN, false);
    
    -- Get profile data
    SELECT * INTO profile_record 
    FROM public.profiles 
    WHERE id = p_profile_id AND church_id = p_church_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Evaluate based on condition type
    CASE condition_type
        WHEN 'FIELD_EQUALS' THEN
            CASE field_name
                WHEN 'member_status' THEN result := profile_record.member_status::TEXT = value_text;
                WHEN 'gender' THEN result := profile_record.gender::TEXT = value_text;
                WHEN 'marital_status' THEN result := profile_record.marital_status::TEXT = value_text;
                WHEN 'email' THEN result := profile_record.email = value_text;
                ELSE result := false;
            END CASE;
            
        WHEN 'FIELD_CONTAINS' THEN
            CASE field_name
                WHEN 'first_name' THEN result := profile_record.first_name ILIKE '%' || value_text || '%';
                WHEN 'last_name' THEN result := profile_record.last_name ILIKE '%' || value_text || '%';
                WHEN 'email' THEN result := profile_record.email ILIKE '%' || value_text || '%';
                ELSE result := false;
            END CASE;
            
        WHEN 'DATE_BEFORE' THEN
            CASE field_name
                WHEN 'birth_date' THEN result := profile_record.birth_date < value_date;
                WHEN 'join_date' THEN result := profile_record.join_date < value_date;
                ELSE result := false;
            END CASE;
            
        WHEN 'DATE_AFTER' THEN
            CASE field_name
                WHEN 'birth_date' THEN result := profile_record.birth_date > value_date;
                WHEN 'join_date' THEN result := profile_record.join_date > value_date;
                ELSE result := false;
            END CASE;
            
        WHEN 'HAS_TAG' THEN
            result := EXISTS(
                SELECT 1 FROM public.member_tags mt
                JOIN public.tags t ON t.id = mt.tag_id
                WHERE mt.profile_id = p_profile_id 
                AND t.name = value_text
            );
            
        WHEN 'IN_GROUP' THEN
            result := EXISTS(
                SELECT 1 FROM public.group_members gm
                JOIN public.groups g ON g.id = gm.group_id
                WHERE gm.profile_id = p_profile_id 
                AND g.name = value_text
                AND gm.is_active = true
            );
            
        WHEN 'CUSTOM_FIELD' THEN
            -- Get custom field value
            SELECT cfv.text_value INTO custom_value
            FROM public.custom_field_values cfv
            JOIN public.custom_field_definitions cfd ON cfd.id = cfv.field_definition_id
            WHERE cfv.record_id = p_profile_id 
            AND cfv.record_type = 'MEMBER'
            AND cfd.name = field_name;
            
            result := custom_value = value_text;
            
        ELSE
            result := false;
    END CASE;
    
    -- Apply negation if specified
    IF is_negated THEN
        result := NOT result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute tag rule
CREATE OR REPLACE FUNCTION public.execute_tag_rule(
    p_rule_id UUID
) RETURNS INTEGER AS $$
DECLARE
    rule_record RECORD;
    condition JSONB;
    profile_record RECORD;
    matches_rule BOOLEAN;
    affected_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    execution_time INTEGER;
BEGIN
    start_time := NOW();
    
    -- Get rule details
    SELECT * INTO rule_record 
    FROM public.tag_rules 
    WHERE id = p_rule_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Process each member in the church
    FOR profile_record IN 
        SELECT id FROM public.profiles 
        WHERE church_id = rule_record.church_id 
        AND is_active = true
    LOOP
        matches_rule := true;
        
        -- Evaluate each condition
        FOR condition IN SELECT * FROM jsonb_array_elements(rule_record.conditions)
        LOOP
            IF NOT public.evaluate_tag_condition(
                rule_record.church_id,
                profile_record.id,
                condition
            ) THEN
                -- For AND operator, any false condition fails the rule
                IF rule_record.rule_operator = 'AND' THEN
                    matches_rule := false;
                    EXIT;
                END IF;
            ELSE
                -- For OR operator, any true condition passes the rule
                IF rule_record.rule_operator = 'OR' THEN
                    matches_rule := true;
                    EXIT;
                END IF;
            END IF;
        END LOOP;
        
        -- Apply tag based on rule result
        IF matches_rule THEN
            -- Assign tag
            PERFORM public.assign_tag_to_member(
                rule_record.church_id,
                profile_record.id,
                rule_record.tag_id,
                NULL, -- System assignment
                'Automatic assignment by rule: ' || rule_record.name,
                true
            );
            affected_count := affected_count + 1;
        ELSE
            -- Remove tag if auto_remove is enabled
            IF (SELECT auto_remove FROM public.tags WHERE id = rule_record.tag_id) THEN
                PERFORM public.remove_tag_from_member(profile_record.id, rule_record.tag_id);
            END IF;
        END IF;
    END LOOP;
    
    -- Update rule execution statistics
    execution_time := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    UPDATE public.tag_rules 
    SET 
        last_run_at = NOW(),
        execution_count = execution_count + 1,
        last_execution_time_ms = execution_time,
        affected_members_count = affected_count,
        next_run_at = CASE 
            WHEN run_frequency = 'hourly' THEN NOW() + INTERVAL '1 hour'
            WHEN run_frequency = 'daily' THEN NOW() + INTERVAL '1 day'
            WHEN run_frequency = 'weekly' THEN NOW() + INTERVAL '1 week'
            ELSE NULL
        END
    WHERE id = p_rule_id;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate smart list members
CREATE OR REPLACE FUNCTION public.calculate_smart_list(
    p_smart_list_id UUID
) RETURNS INTEGER AS $$
DECLARE
    list_record RECORD;
    member_count INTEGER := 0;
    start_time TIMESTAMPTZ;
    calculation_time INTEGER;
BEGIN
    start_time := NOW();
    
    -- Get smart list details
    SELECT * INTO list_record 
    FROM public.smart_lists 
    WHERE id = p_smart_list_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Clear existing members
    DELETE FROM public.smart_list_members 
    WHERE smart_list_id = p_smart_list_id;
    
    -- Execute custom SQL if provided
    IF list_record.custom_sql IS NOT NULL THEN
        -- Note: In production, this would need careful SQL injection protection
        -- For now, we'll skip custom SQL execution for security
        RAISE NOTICE 'Custom SQL execution not implemented for security reasons';
    END IF;
    
    -- Calculate based on tag rules (simplified implementation)
    -- This would be expanded to handle complex tag and field rules
    
    -- Update statistics
    calculation_time := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    UPDATE public.smart_lists 
    SET 
        member_count = member_count,
        last_calculated_at = NOW(),
        calculation_time_ms = calculation_time
    WHERE id = p_smart_list_id;
    
    RETURN member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tag_rules_updated_at
    BEFORE UPDATE ON public.tag_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER smart_lists_updated_at
    BEFORE UPDATE ON public.smart_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
