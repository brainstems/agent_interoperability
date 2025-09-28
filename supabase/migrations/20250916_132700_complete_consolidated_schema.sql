-- COMPLETE CONSOLIDATED MIGRATION: All Schema Components
-- Created: 2025-09-16 13:27:00

-- Extensions and Types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'CLERGY', 'STAFF', 'VOLUNTEER', 'MEMBER', 'VISITOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marital_status') THEN
        CREATE TYPE marital_status AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
        CREATE TYPE member_status AS ENUM ('VISITOR', 'REGULAR_ATTENDEE', 'MEMBER', 'INACTIVE', 'TRANSFERRED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_level') THEN
        CREATE TYPE visibility_level AS ENUM ('PRIVATE', 'CHURCH_ONLY', 'PUBLIC');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
        CREATE TYPE connection_status AS ENUM ('SUGGESTED', 'CONTACTED', 'CONNECTED', 'ACTIVE', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM ('SERVICE', 'BIBLE_STUDY', 'FELLOWSHIP', 'OUTREACH', 'MEETING', 'CONFERENCE', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fund_type') THEN
        CREATE TYPE fund_type AS ENUM ('GENERAL', 'BUILDING', 'MISSIONS', 'BENEVOLENCE', 'SPECIAL', 'DESIGNATED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER', 'ONLINE', 'CRYPTOCURRENCY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE communication_type AS ENUM ('EMAIL', 'SMS', 'PHONE', 'MAIL', 'IN_PERSON', 'PUSH_NOTIFICATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

-- Core Tables
CREATE TABLE IF NOT EXISTS public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address JSONB,
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address JSONB,
    birth_date DATE,
    gender gender,
    marital_status marital_status,
    member_status member_status DEFAULT 'VISITOR',
    join_date DATE,
    role user_role DEFAULT 'MEMBER',
    bio TEXT,
    photo_url TEXT,
    interests TEXT[],
    life_events JSONB DEFAULT '{}',
    connection_preferences JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    primary_contact_id UUID REFERENCES public.profiles(id),
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    group_type TEXT NOT NULL,
    leader_id UUID REFERENCES public.profiles(id),
    meeting_schedule JSONB,
    location TEXT,
    max_capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type event_type DEFAULT 'OTHER',
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    location TEXT,
    max_attendees INTEGER,
    registration_required BOOLEAN DEFAULT false,
    registration_deadline TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered',
    notes TEXT,
    UNIQUE(event_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    attended BOOLEAN DEFAULT true,
    notes TEXT,
    UNIQUE(event_id, profile_id)
);

-- Financial Tables
CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    fund_type fund_type DEFAULT 'GENERAL',
    target_amount DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method NOT NULL,
    check_number TEXT,
    transaction_id TEXT,
    notes TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurring_donation_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication and Workflow Tables
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    communication_type communication_type NOT NULL,
    status TEXT DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    template_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    related_to_id UUID,
    related_to_type TEXT,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL,
    priority task_priority DEFAULT 'MEDIUM',
    status task_status DEFAULT 'PENDING',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Agent Tables
CREATE TABLE IF NOT EXISTS agent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    goal TEXT NOT NULL,
    backstory TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_specialized BOOLEAN DEFAULT false,
    max_execution_time INTEGER DEFAULT 300,
    max_iterations INTEGER DEFAULT 10,
    allow_delegation BOOLEAN DEFAULT false,
    verbose BOOLEAN DEFAULT false,
    memory_enabled BOOLEAN DEFAULT true,
    system_template TEXT,
    prompt_template TEXT,
    response_template TEXT,
    llm_config JSONB DEFAULT '{}',
    tools JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(church_id, name)
);

CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    connection_reason TEXT,
    match_percentage INTEGER CHECK (match_percentage >= 0 AND match_percentage <= 100),
    connection_strength INTEGER CHECK (connection_strength >= 1 AND connection_strength <= 10),
    suggested_engagement TEXT,
    common_interests TEXT[],
    status connection_status DEFAULT 'SUGGESTED',
    privacy visibility_level DEFAULT 'CHURCH_ONLY',
    contacted_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user_id != member_id),
    UNIQUE(user_id, member_id)
);

-- RLS Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin_or_clergy(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND role IN ('ADMIN', 'CLERGY')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_church_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT church_id FROM public.profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_definitions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view their own church" ON public.churches FOR SELECT TO authenticated USING (id = public.get_user_church_id());
CREATE POLICY "Users can view profiles in their church" ON public.profiles FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can view events in their church" ON public.events FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());
CREATE POLICY "Users can view funds in their church" ON public.funds FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());
CREATE POLICY "Users can view their own donations" ON public.donations FOR SELECT TO authenticated USING (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'CLERGY', 'STAFF') AND church_id = donations.church_id));
CREATE POLICY "Users can view tasks assigned to them" ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin_or_clergy());
CREATE POLICY "Users can view connections involving them" ON public.connections FOR SELECT TO authenticated USING (user_id = auth.uid() OR member_id = auth.uid() OR public.is_admin_or_clergy());
CREATE POLICY "Anyone can view active interests" ON public.interests FOR SELECT TO authenticated USING (is_active = true);

-- Insert System Church and Sample Agent
INSERT INTO churches (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'System Default Church') ON CONFLICT (id) DO NOTHING;

INSERT INTO agent_definitions (church_id, name, role, goal, backstory, allow_delegation, verbose, memory_enabled, max_iterations, max_execution_time, created_by, is_specialized) VALUES 
('00000000-0000-0000-0000-000000000000', 'inactivity_alert_agent', 'Member Engagement Monitor', 'Identify members who have become inactive and facilitate re-engagement through appropriate outreach', 'You are a compassionate pastoral care assistant who monitors member attendance patterns. When you notice someone has been absent from worship or church activities for 4+ weeks, you understand this could indicate personal struggles, life changes, or spiritual drift.', false, true, true, 5, 300, NULL, true) ON CONFLICT (church_id, name) DO NOTHING;

-- Basic Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER on_churches_update_timestamp
BEFORE UPDATE ON public.churches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Views
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.profiles WHERE is_active = true) AS active_members,
    (SELECT COUNT(*) FROM public.events WHERE start_datetime > NOW()) AS upcoming_events,
    (SELECT SUM(amount) FROM public.donations WHERE donation_date > (NOW() - INTERVAL '30 days')) AS recent_donations;
