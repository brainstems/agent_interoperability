-- Vocal Connect AI Integration Schema
-- Extends Church CRM with micro-volunteering and communication services

-- Create custom types for micro-volunteering
CREATE TYPE public.volunteer_risk_tier AS ENUM ('R0', 'R1', 'R2');
CREATE TYPE public.volunteer_transport_mode AS ENUM ('car', 'bike', 'walk', 'public_transit');
CREATE TYPE public.volunteer_availability_type AS ENUM ('recurring', 'adhoc');
CREATE TYPE public.assistance_case_status AS ENUM ('open', 'pending_offer', 'assigned', 'in_progress', 'delivered', 'closed', 'escalated');
CREATE TYPE public.assistance_urgency AS ENUM ('today', 'this_week', 'flexible');
CREATE TYPE public.assistance_payment_preference AS ENUM ('donation', 'reimburse', 'snap', 'free');
CREATE TYPE public.volunteer_offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE public.volunteer_verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Church Volunteers (extends members who volunteer)
CREATE TABLE public.church_volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Link to existing profile (member)
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  
  -- Volunteer-specific preferences (contact info comes from profiles table)
  languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  
  -- Location preferences
  service_zip TEXT,
  service_radius_km INTEGER NOT NULL DEFAULT 5,
  
  -- Micro-commitment settings
  max_tasks_per_week INTEGER NOT NULL DEFAULT 2,
  max_task_duration_min INTEGER NOT NULL DEFAULT 45,
  
  -- Preferences
  transport_modes volunteer_transport_mode[] NOT NULL DEFAULT ARRAY['car']::volunteer_transport_mode[],
  interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  risk_tier volunteer_risk_tier NOT NULL DEFAULT 'R1',
  
  -- Verification
  verification_status volunteer_verification_status NOT NULL DEFAULT 'pending',
  verification_level INTEGER NOT NULL DEFAULT 0,
  background_check_date DATE,
  
  -- Notification settings
  notify_channels TEXT[] NOT NULL DEFAULT ARRAY['sms'],
  quiet_hours_start TIME NOT NULL DEFAULT '21:00',
  quiet_hours_end TIME NOT NULL DEFAULT '08:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Performance tracking
  reliability_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  weekly_task_quota_used INTEGER NOT NULL DEFAULT 0,
  quota_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  paused BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  
  UNIQUE(profile_id, church_id)
);

-- Volunteer Availability
CREATE TABLE public.volunteer_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES public.church_volunteers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  availability_type volunteer_availability_type NOT NULL,
  
  -- For recurring availability
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  start_time TIME,
  end_time TIME,
  
  -- For ad-hoc availability
  start_datetime TIMESTAMP WITH TIME ZONE,
  end_datetime TIMESTAMP WITH TIME ZONE,
  
  -- General
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  active BOOLEAN NOT NULL DEFAULT true
);

-- Member Assistance Cases (pastoral care + micro-volunteering)
CREATE TABLE public.member_assistance_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Church and member context
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  initiated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Clergy/staff who initiated
  
  -- Case information
  case_type TEXT NOT NULL DEFAULT 'food_access', -- food_access, transportation, companionship, etc.
  status assistance_case_status NOT NULL DEFAULT 'open',
  urgency assistance_urgency NOT NULL DEFAULT 'flexible',
  
  -- Contact details (may differ from member record)
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_language TEXT NOT NULL DEFAULT 'en',
  
  -- Fulfillment window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Location
  address TEXT NOT NULL,
  address_notes TEXT,
  geo_lat DECIMAL(10, 8),
  geo_lng DECIMAL(11, 8),
  
  -- Request details
  items_requested TEXT[],
  dietary_restrictions TEXT[],
  payment_preference assistance_payment_preference NOT NULL DEFAULT 'donation',
  special_instructions TEXT,
  
  -- Consent and safety
  consent_to_share BOOLEAN NOT NULL DEFAULT false,
  risk_flags TEXT[],
  pastoral_notes TEXT, -- Private notes for clergy
  
  -- Call/communication tracking
  call_transcript_id TEXT,
  consent_audio_url TEXT,
  communication_log JSONB DEFAULT '[]'::jsonb,
  
  -- Assignment tracking
  assigned_volunteer_id UUID REFERENCES public.church_volunteers(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- Escalation
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalation_reason TEXT,
  escalated_to_profile_id UUID REFERENCES public.profiles(id), -- Escalated to which clergy/staff
  partner_agency TEXT
);

-- Volunteer Offers (matching system)
CREATE TABLE public.volunteer_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  case_id UUID NOT NULL REFERENCES public.member_assistance_cases(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.church_volunteers(id) ON DELETE CASCADE,
  
  status volunteer_offer_status NOT NULL DEFAULT 'pending',
  matching_score DECIMAL(5,3), -- AI-generated matching score
  
  -- Response tracking
  offered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_method TEXT, -- sms, email, call, app
  
  -- Delivery tracking (if accepted)
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  drop_code TEXT,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- Communication log
  communication_log JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(case_id, volunteer_id)
);

-- Communication Events (extends existing event system)
CREATE TABLE public.volunteer_communication_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- volunteer_offer_sent, volunteer_response, case_update, etc.
  
  -- Related entities
  volunteer_id UUID REFERENCES public.church_volunteers(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.member_assistance_cases(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.volunteer_offers(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Communication details
  channel TEXT NOT NULL, -- sms, email, call, push
  direction TEXT NOT NULL, -- inbound, outbound
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, read, failed
  external_id TEXT, -- Twilio SID, SendGrid ID, etc.
  
  -- Response tracking
  response_expected BOOLEAN DEFAULT false,
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_content TEXT
);

-- Enable Row Level Security
ALTER TABLE public.church_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_assistance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_communication_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (church-scoped access)
CREATE POLICY "Church volunteers access" ON public.church_volunteers 
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Volunteer availability access" ON public.volunteer_availability 
  FOR ALL USING (
    volunteer_id IN (
      SELECT cv.id FROM public.church_volunteers cv
      JOIN public.profiles p ON cv.church_id = p.church_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Assistance cases access" ON public.member_assistance_cases 
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Volunteer offers access" ON public.volunteer_offers 
  FOR ALL USING (
    case_id IN (
      SELECT mac.id FROM public.member_assistance_cases mac
      JOIN public.profiles p ON mac.church_id = p.church_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Communication events access" ON public.volunteer_communication_events 
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_church_volunteers_profile ON public.church_volunteers(profile_id, church_id);
CREATE INDEX idx_church_volunteers_active ON public.church_volunteers(church_id, active, paused);
CREATE INDEX idx_church_volunteers_location ON public.church_volunteers(service_zip, service_radius_km);
CREATE INDEX idx_church_volunteers_risk_tier ON public.church_volunteers(risk_tier, verification_status);

CREATE INDEX idx_volunteer_availability_volunteer ON public.volunteer_availability(volunteer_id, active);
CREATE INDEX idx_volunteer_availability_recurring ON public.volunteer_availability(availability_type, days_of_week) WHERE availability_type = 'recurring';

CREATE INDEX idx_assistance_cases_church_status ON public.member_assistance_cases(church_id, status);
CREATE INDEX idx_assistance_cases_profile ON public.member_assistance_cases(profile_id, church_id);
CREATE INDEX idx_assistance_cases_urgency ON public.member_assistance_cases(urgency, window_start);
CREATE INDEX idx_assistance_cases_location ON public.member_assistance_cases(geo_lat, geo_lng) WHERE geo_lat IS NOT NULL;
CREATE INDEX idx_assistance_cases_assigned ON public.member_assistance_cases(assigned_volunteer_id, status);

CREATE INDEX idx_volunteer_offers_case_status ON public.volunteer_offers(case_id, status);
CREATE INDEX idx_volunteer_offers_volunteer_status ON public.volunteer_offers(volunteer_id, status);
CREATE INDEX idx_volunteer_offers_expires ON public.volunteer_offers(expires_at) WHERE status = 'pending';

CREATE INDEX idx_communication_events_church ON public.volunteer_communication_events(church_id, created_at);
CREATE INDEX idx_communication_events_volunteer ON public.volunteer_communication_events(volunteer_id, event_type);
CREATE INDEX idx_communication_events_case ON public.volunteer_communication_events(case_id, event_type);

-- Triggers for updated_at
CREATE TRIGGER update_church_volunteers_updated_at
  BEFORE UPDATE ON public.church_volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_member_assistance_cases_updated_at
  BEFORE UPDATE ON public.member_assistance_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_offers_updated_at
  BEFORE UPDATE ON public.volunteer_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
