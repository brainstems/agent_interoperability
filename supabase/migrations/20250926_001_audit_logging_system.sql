-- AUDIT LOGGING SYSTEM MIGRATION
-- Created: 2025-09-26
-- Purpose: Comprehensive audit logging for compliance and forensic analysis

-- Audit Log Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_severity') THEN
        CREATE TYPE audit_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    END IF;
END $$;

-- Main Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    api_client_id UUID, -- For API client tracking
    session_id TEXT,
    
    -- Action Details
    action audit_action NOT NULL,
    resource_type TEXT NOT NULL, -- 'member', 'event', 'donation', etc.
    resource_id UUID,
    resource_name TEXT, -- Human readable resource identifier
    
    -- Change Details
    old_values JSONB, -- Previous state for UPDATE/DELETE
    new_values JSONB, -- New state for CREATE/UPDATE
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Context
    severity audit_severity DEFAULT 'LOW',
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    request_params JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT audit_logs_church_id_idx CHECK (church_id IS NOT NULL)
);

-- Data Change History Table (for detailed field-level tracking)
CREATE TABLE IF NOT EXISTS public.data_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES public.audit_logs(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Field Details
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT, -- 'string', 'number', 'date', 'json', etc.
    
    -- Values
    old_value TEXT,
    new_value TEXT,
    old_value_json JSONB, -- For complex data types
    new_value_json JSONB,
    
    -- Context
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Client Management Table
CREATE TABLE IF NOT EXISTS public.api_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Client Details
    name TEXT NOT NULL,
    description TEXT,
    client_id TEXT UNIQUE NOT NULL,
    client_secret_hash TEXT NOT NULL,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    allowed_origins TEXT[], -- For CORS
    rate_limit_per_hour INTEGER DEFAULT 1000,
    permissions JSONB DEFAULT '{}', -- Granular permissions
    
    -- Tracking
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage Logs Table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    api_client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Request Details
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Events Table
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Event Details
    event_type TEXT NOT NULL, -- 'failed_login', 'suspicious_activity', 'permission_denied', etc.
    severity audit_severity DEFAULT 'MEDIUM',
    description TEXT NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB DEFAULT '{}',
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_church_id ON public.audit_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_data_change_history_audit_log ON public.data_change_history(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_data_change_history_record ON public.data_change_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_change_history_created_at ON public.data_change_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_client ON public.api_usage_logs(api_client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_church_id ON public.security_events(church_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Audit logs can only be viewed by admin/clergy
CREATE POLICY "Admin and clergy can view audit logs" ON public.audit_logs 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Admin and clergy can view change history" ON public.data_change_history 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Admin can manage API clients" ON public.api_clients 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Admin can view API usage logs" ON public.api_usage_logs 
    FOR SELECT TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

CREATE POLICY "Admin and clergy can view security events" ON public.security_events 
    FOR ALL TO authenticated 
    USING (church_id = public.get_user_church_id() AND public.is_admin_or_clergy())
    WITH CHECK (church_id = public.get_user_church_id() AND public.is_admin_or_clergy());

-- Audit Logging Functions
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_church_id UUID,
    p_user_id UUID,
    p_action audit_action,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_resource_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_severity audit_severity DEFAULT 'LOW',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    changed_fields TEXT[];
BEGIN
    -- Calculate changed fields if both old and new values provided
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT array_agg(key) INTO changed_fields
        FROM (
            SELECT key FROM jsonb_each(p_old_values)
            EXCEPT
            SELECT key FROM jsonb_each(p_new_values)
            UNION
            SELECT key FROM jsonb_each(p_new_values)
            EXCEPT
            SELECT key FROM jsonb_each(p_old_values)
        ) AS changed;
    END IF;

    -- Insert audit log
    INSERT INTO public.audit_logs (
        church_id, user_id, action, resource_type, resource_id, resource_name,
        old_values, new_values, changed_fields, description, severity,
        ip_address, user_agent, metadata
    ) VALUES (
        p_church_id, p_user_id, p_action, p_resource_type, p_resource_id, p_resource_name,
        p_old_values, p_new_values, changed_fields, p_description, p_severity,
        p_ip_address, p_user_agent, p_metadata
    ) RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log detailed field changes
CREATE OR REPLACE FUNCTION public.log_field_changes(
    p_audit_log_id UUID,
    p_church_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_record JSONB,
    p_new_record JSONB
) RETURNS VOID AS $$
DECLARE
    field_record RECORD;
BEGIN
    -- Log each changed field
    FOR field_record IN
        SELECT 
            key as field_name,
            old_val.value as old_value,
            new_val.value as new_value
        FROM jsonb_each(p_old_record) old_val
        FULL OUTER JOIN jsonb_each(p_new_record) new_val ON old_val.key = new_val.key
        WHERE old_val.value IS DISTINCT FROM new_val.value
    LOOP
        INSERT INTO public.data_change_history (
            audit_log_id, church_id, table_name, record_id, field_name,
            old_value, new_value, old_value_json, new_value_json
        ) VALUES (
            p_audit_log_id, p_church_id, p_table_name, p_record_id, field_record.field_name,
            field_record.old_value::TEXT, field_record.new_value::TEXT,
            field_record.old_value, field_record.new_value
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old audit logs and related data
    WITH deleted_logs AS (
        DELETE FROM public.audit_logs 
        WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_logs;
    
    -- Clean up orphaned change history records
    DELETE FROM public.data_change_history 
    WHERE audit_log_id NOT IN (SELECT id FROM public.audit_logs);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_action audit_action;
    old_values JSONB;
    new_values JSONB;
    church_id_val UUID;
    user_id_val UUID;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        audit_action := 'CREATE';
        new_values := to_jsonb(NEW);
        church_id_val := NEW.church_id;
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
        church_id_val := NEW.church_id;
    ELSIF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        old_values := to_jsonb(OLD);
        church_id_val := OLD.church_id;
    END IF;

    -- Get current user (if available)
    user_id_val := auth.uid();

    -- Log the audit event
    PERFORM public.log_audit_event(
        church_id_val,
        user_id_val,
        audit_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.name, NEW.title, NEW.first_name || ' ' || NEW.last_name, 'Record'),
        old_values,
        new_values,
        'Automatic audit log for ' || TG_TABLE_NAME
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_donations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_groups_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_communications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.communications
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_tasks_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
