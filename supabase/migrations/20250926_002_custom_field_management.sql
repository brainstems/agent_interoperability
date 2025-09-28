-- CUSTOM FIELD MANAGEMENT SYSTEM MIGRATION
-- Created: 2025-09-26
-- Purpose: Dynamic custom field definitions and validation system

-- Custom Field Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
        CREATE TYPE field_type AS ENUM (
            'TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'DATE', 'DATETIME', 
            'BOOLEAN', 'SELECT', 'MULTISELECT', 'EMAIL', 'PHONE', 'URL', 
            'FILE', 'IMAGE', 'JSON', 'ENCRYPTED'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_scope') THEN
        CREATE TYPE field_scope AS ENUM ('MEMBER', 'EVENT', 'GROUP', 'DONATION', 'TASK', 'COMMUNICATION');
    END IF;
END $$;

-- Custom Field Definitions Table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Field Identity
    name TEXT NOT NULL, -- Internal name (snake_case)
    display_name TEXT NOT NULL, -- Human readable name
    description TEXT,
    field_type field_type NOT NULL,
    scope field_scope NOT NULL,
    
    -- Configuration
    is_required BOOLEAN DEFAULT false,
    is_unique BOOLEAN DEFAULT false,
    is_searchable BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    
    -- Validation Rules
    min_length INTEGER,
    max_length INTEGER,
    min_value DECIMAL,
    max_value DECIMAL,
    regex_pattern TEXT,
    validation_message TEXT,
    
    -- Options for SELECT/MULTISELECT
    field_options JSONB DEFAULT '[]', -- [{"value": "option1", "label": "Option 1"}, ...]
    
    -- Default Value
    default_value TEXT,
    default_value_json JSONB,
    
    -- Display Configuration
    display_order INTEGER DEFAULT 0,
    group_name TEXT, -- For organizing fields into groups
    help_text TEXT,
    placeholder TEXT,
    
    -- Permissions
    view_roles TEXT[] DEFAULT '{"ADMIN", "CLERGY", "STAFF"}',
    edit_roles TEXT[] DEFAULT '{"ADMIN", "CLERGY", "STAFF"}',
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(church_id, scope, name),
    CONSTRAINT valid_field_options CHECK (
        field_type NOT IN ('SELECT', 'MULTISELECT') OR 
        (field_options IS NOT NULL AND jsonb_array_length(field_options) > 0)
    )
);

-- Custom Field Values Table (for non-JSONB storage and indexing)
CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    
    -- Record Reference
    record_id UUID NOT NULL, -- References the actual record (member, event, etc.)
    record_type field_scope NOT NULL,
    
    -- Values (store in appropriate column based on type)
    text_value TEXT,
    number_value DECIMAL,
    date_value DATE,
    datetime_value TIMESTAMPTZ,
    boolean_value BOOLEAN,
    json_value JSONB,
    encrypted_value TEXT, -- For sensitive data
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(field_definition_id, record_id),
    CONSTRAINT valid_value_type CHECK (
        (text_value IS NOT NULL)::INTEGER +
        (number_value IS NOT NULL)::INTEGER +
        (date_value IS NOT NULL)::INTEGER +
        (datetime_value IS NOT NULL)::INTEGER +
        (boolean_value IS NOT NULL)::INTEGER +
        (json_value IS NOT NULL)::INTEGER +
        (encrypted_value IS NOT NULL)::INTEGER = 1
    )
);

-- Field Validation Rules Table (for complex validation)
CREATE TABLE IF NOT EXISTS public.field_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    
    -- Rule Definition
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'regex', 'range', 'custom', 'dependency'
    rule_config JSONB NOT NULL, -- Configuration for the rule
    error_message TEXT NOT NULL,
    
    -- Conditions
    is_active BOOLEAN DEFAULT true,
    applies_when JSONB, -- Conditions when this rule applies
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Field Templates (for reusable field sets)
CREATE TABLE IF NOT EXISTS public.custom_field_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Template Details
    name TEXT NOT NULL,
    description TEXT,
    scope field_scope NOT NULL,
    is_public BOOLEAN DEFAULT false, -- Can be shared across churches
    
    -- Template Configuration
    field_definitions JSONB NOT NULL, -- Array of field definitions
    
    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(church_id, scope, name)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_church_scope ON public.custom_field_definitions(church_id, scope);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_searchable ON public.custom_field_definitions(church_id, is_searchable) WHERE is_searchable = true;

CREATE INDEX IF NOT EXISTS idx_custom_field_values_record ON public.custom_field_values(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON public.custom_field_values(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_text ON public.custom_field_values(text_value) WHERE text_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_number ON public.custom_field_values(number_value) WHERE number_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_date ON public.custom_field_values(date_value) WHERE date_value IS NOT NULL;

-- RLS Policies
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_templates ENABLE ROW LEVEL SECURITY;

-- Field definitions can be managed by admin/clergy
CREATE POLICY "Admin and clergy can manage field definitions" ON public.custom_field_definitions 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

-- Field values follow the same access as the parent record
CREATE POLICY "Users can access field values for their church" ON public.custom_field_values 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id())
    WITH CHECK (church_id = public.get_user_church_id());

CREATE POLICY "Admin and clergy can manage validation rules" ON public.field_validation_rules 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Users can view templates for their church" ON public.custom_field_templates 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id() OR is_public = true);

CREATE POLICY "Admin and clergy can manage templates" ON public.custom_field_templates 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

-- Custom Field Management Functions

-- Function to validate field value against definition
CREATE OR REPLACE FUNCTION public.validate_custom_field_value(
    p_field_definition_id UUID,
    p_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    field_def RECORD;
    numeric_value DECIMAL;
    date_value DATE;
    option_found BOOLEAN;
BEGIN
    -- Get field definition
    SELECT * INTO field_def 
    FROM public.custom_field_definitions 
    WHERE id = p_field_definition_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check required fields
    IF field_def.is_required AND (p_value IS NULL OR p_value = '') THEN
        RETURN false;
    END IF;
    
    -- Skip validation for empty optional fields
    IF p_value IS NULL OR p_value = '' THEN
        RETURN true;
    END IF;
    
    -- Type-specific validation
    CASE field_def.field_type
        WHEN 'TEXT', 'TEXTAREA' THEN
            -- Length validation
            IF field_def.min_length IS NOT NULL AND length(p_value) < field_def.min_length THEN
                RETURN false;
            END IF;
            IF field_def.max_length IS NOT NULL AND length(p_value) > field_def.max_length THEN
                RETURN false;
            END IF;
            
        WHEN 'NUMBER', 'DECIMAL' THEN
            -- Numeric validation
            BEGIN
                numeric_value := p_value::DECIMAL;
                IF field_def.min_value IS NOT NULL AND numeric_value < field_def.min_value THEN
                    RETURN false;
                END IF;
                IF field_def.max_value IS NOT NULL AND numeric_value > field_def.max_value THEN
                    RETURN false;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RETURN false;
            END;
            
        WHEN 'DATE' THEN
            -- Date validation
            BEGIN
                date_value := p_value::DATE;
            EXCEPTION WHEN OTHERS THEN
                RETURN false;
            END;
            
        WHEN 'EMAIL' THEN
            -- Email validation
            IF p_value !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                RETURN false;
            END IF;
            
        WHEN 'SELECT' THEN
            -- Option validation
            SELECT EXISTS(
                SELECT 1 FROM jsonb_array_elements(field_def.field_options) AS option
                WHERE option->>'value' = p_value
            ) INTO option_found;
            
            IF NOT option_found THEN
                RETURN false;
            END IF;
            
        WHEN 'BOOLEAN' THEN
            -- Boolean validation
            IF p_value NOT IN ('true', 'false', '1', '0', 'yes', 'no') THEN
                RETURN false;
            END IF;
    END CASE;
    
    -- Regex validation
    IF field_def.regex_pattern IS NOT NULL THEN
        IF p_value !~ field_def.regex_pattern THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get custom fields for a record
CREATE OR REPLACE FUNCTION public.get_custom_fields_for_record(
    p_church_id UUID,
    p_record_type field_scope,
    p_record_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    field_record RECORD;
BEGIN
    FOR field_record IN
        SELECT 
            cfd.name,
            cfd.display_name,
            cfd.field_type,
            cfd.is_required,
            COALESCE(
                cfv.text_value,
                cfv.number_value::TEXT,
                cfv.date_value::TEXT,
                cfv.datetime_value::TEXT,
                cfv.boolean_value::TEXT,
                cfv.json_value::TEXT,
                cfd.default_value
            ) as value
        FROM public.custom_field_definitions cfd
        LEFT JOIN public.custom_field_values cfv ON (
            cfv.field_definition_id = cfd.id AND 
            cfv.record_id = p_record_id
        )
        WHERE cfd.church_id = p_church_id 
        AND cfd.scope = p_record_type
        AND cfd.is_visible = true
        ORDER BY cfd.display_order, cfd.display_name
    LOOP
        result := result || jsonb_build_object(field_record.name, field_record.value);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set custom field value
CREATE OR REPLACE FUNCTION public.set_custom_field_value(
    p_church_id UUID,
    p_field_definition_id UUID,
    p_record_id UUID,
    p_record_type field_scope,
    p_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    field_def RECORD;
    converted_value RECORD;
BEGIN
    -- Get field definition
    SELECT * INTO field_def 
    FROM public.custom_field_definitions 
    WHERE id = p_field_definition_id AND church_id = p_church_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Field definition not found';
    END IF;
    
    -- Validate the value
    IF NOT public.validate_custom_field_value(p_field_definition_id, p_value) THEN
        RAISE EXCEPTION 'Invalid field value';
    END IF;
    
    -- Convert value to appropriate type
    SELECT 
        CASE field_def.field_type
            WHEN 'TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'URL', 'SELECT' THEN p_value
            ELSE NULL
        END as text_val,
        CASE field_def.field_type
            WHEN 'NUMBER', 'DECIMAL' THEN p_value::DECIMAL
            ELSE NULL
        END as number_val,
        CASE field_def.field_type
            WHEN 'DATE' THEN p_value::DATE
            ELSE NULL
        END as date_val,
        CASE field_def.field_type
            WHEN 'DATETIME' THEN p_value::TIMESTAMPTZ
            ELSE NULL
        END as datetime_val,
        CASE field_def.field_type
            WHEN 'BOOLEAN' THEN p_value::BOOLEAN
            ELSE NULL
        END as boolean_val,
        CASE field_def.field_type
            WHEN 'JSON', 'MULTISELECT' THEN p_value::JSONB
            ELSE NULL
        END as json_val
    INTO converted_value;
    
    -- Insert or update the value
    INSERT INTO public.custom_field_values (
        church_id, field_definition_id, record_id, record_type,
        text_value, number_value, date_value, datetime_value, boolean_value, json_value
    ) VALUES (
        p_church_id, p_field_definition_id, p_record_id, p_record_type,
        converted_value.text_val, converted_value.number_val, converted_value.date_val,
        converted_value.datetime_val, converted_value.boolean_val, converted_value.json_val
    )
    ON CONFLICT (field_definition_id, record_id)
    DO UPDATE SET
        text_value = converted_value.text_val,
        number_value = converted_value.number_val,
        date_value = converted_value.date_val,
        datetime_value = converted_value.datetime_val,
        boolean_value = converted_value.boolean_val,
        json_value = converted_value.json_val,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create field definition from template
CREATE OR REPLACE FUNCTION public.apply_field_template(
    p_church_id UUID,
    p_template_id UUID,
    p_scope field_scope
) RETURNS INTEGER AS $$
DECLARE
    template_record RECORD;
    field_def JSONB;
    created_count INTEGER := 0;
BEGIN
    -- Get template
    SELECT * INTO template_record 
    FROM public.custom_field_templates 
    WHERE id = p_template_id AND (church_id = p_church_id OR is_public = true);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Create field definitions from template
    FOR field_def IN SELECT * FROM jsonb_array_elements(template_record.field_definitions)
    LOOP
        INSERT INTO public.custom_field_definitions (
            church_id, name, display_name, description, field_type, scope,
            is_required, is_unique, is_searchable, is_visible, is_editable,
            min_length, max_length, min_value, max_value, regex_pattern,
            field_options, default_value, display_order, group_name, help_text, placeholder
        ) VALUES (
            p_church_id,
            field_def->>'name',
            field_def->>'display_name',
            field_def->>'description',
            (field_def->>'field_type')::field_type,
            p_scope,
            COALESCE((field_def->>'is_required')::BOOLEAN, false),
            COALESCE((field_def->>'is_unique')::BOOLEAN, false),
            COALESCE((field_def->>'is_searchable')::BOOLEAN, true),
            COALESCE((field_def->>'is_visible')::BOOLEAN, true),
            COALESCE((field_def->>'is_editable')::BOOLEAN, true),
            (field_def->>'min_length')::INTEGER,
            (field_def->>'max_length')::INTEGER,
            (field_def->>'min_value')::DECIMAL,
            (field_def->>'max_value')::DECIMAL,
            field_def->>'regex_pattern',
            field_def->'field_options',
            field_def->>'default_value',
            COALESCE((field_def->>'display_order')::INTEGER, 0),
            field_def->>'group_name',
            field_def->>'help_text',
            field_def->>'placeholder'
        )
        ON CONFLICT (church_id, scope, name) DO NOTHING;
        
        GET DIAGNOSTICS created_count = ROW_COUNT;
        created_count := created_count + created_count;
    END LOOP;
    
    -- Update template usage count
    UPDATE public.custom_field_templates 
    SET usage_count = usage_count + 1 
    WHERE id = p_template_id;
    
    RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER custom_field_definitions_updated_at
    BEFORE UPDATE ON public.custom_field_definitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER custom_field_values_updated_at
    BEFORE UPDATE ON public.custom_field_values
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER custom_field_templates_updated_at
    BEFORE UPDATE ON public.custom_field_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
