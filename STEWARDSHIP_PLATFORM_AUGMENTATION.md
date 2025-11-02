# Event-Based Stewardship Platform - Augmentation Strategy

## Executive Summary
This document outlines the strategy to augment the existing church management system with comprehensive event-based stewardship capabilities while adhering to the **REUSE FIRST** principle. We will leverage 60-70% of existing infrastructure and add strategic enhancements.

## Current Architecture Assessment

### ✅ Existing Capabilities (REUSE)

#### 1. **Multi-Tenancy Foundation**
- ✅ `churches` table with settings/configuration
- ✅ `profiles` table with church_id foreign key
- ✅ RLS policies for data isolation
- **REUSE:** Extend to support diocese/network hierarchy

#### 2. **Event Management**
- ✅ `events` table with types, registration, attendance
- ✅ `event_registrations` and `event_attendance` tracking
- ✅ Event-driven architecture via `event-bus.ts`
- **REUSE:** Add campaign/journey association and RSVP enhancements

#### 3. **Financial System**
- ✅ `donations` table with payment methods
- ✅ `pledges` and `pledge_payments` tables
- ✅ `recurring_donations` with scheduling
- ✅ `funds` table for multi-fund support
- **REUSE:** Extend for time/talent pledges and multi-fund splits

#### 4. **Member & Household Management**
- ✅ `profiles` and `families` tables
- ✅ Custom fields support via JSONB
- ✅ Life events tracking
- **REUSE:** Add consent flags and planned giving intent

#### 5. **Communication System**
- ✅ `communications` table with multi-channel support
- ✅ Email, SMS, Push notification infrastructure
- ✅ Template system via `content_templates`
- **REUSE:** Add A/B testing and send-time optimization

#### 6. **Workflow Automation**
- ✅ `workflows`, `workflow_steps`, `workflow_executions`
- ✅ Event-driven triggers
- ✅ `automation_workflows` with actions
- **REUSE:** Extend to journey designer with branching

#### 7. **AI Agent Framework**
- ✅ CrewAI integration (`crewai_agents`, `crewai_crews`)
- ✅ Stewardship analyst agent exists
- ✅ Tool system (`giving_analyzer`, etc.)
- **REUSE:** Add NBA and propensity model tools

#### 8. **Volunteer Management**
- ✅ `volunteers`, `volunteer_positions`, `volunteer_assignments`
- **REUSE:** Integrate with time pledge tracking

#### 9. **Reporting & Analytics**
- ✅ `reports`, `dashboards`, `dashboard_widgets`
- ✅ Advanced reporting system
- **REUSE:** Add impact metrics and benchmarking views

#### 10. **Audit & Compliance**
- ✅ Audit logging system exists
- ✅ Role-based permissions
- **REUSE:** Extend for GDPR/consent compliance

---

## 🆕 Required Augmentations

### Phase 1: Organizational Hierarchy & Multi-Church (FR-1, FR-2, FR-3)

#### New Database Tables
```sql
-- Diocese/Network organization hierarchy
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'diocese', 'network', 'denomination'
  parent_id UUID REFERENCES organizations(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link churches to organizations
ALTER TABLE churches ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE churches ADD COLUMN is_template BOOLEAN DEFAULT false;

-- Cross-church program templates
CREATE TABLE stewardship_programs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  program_type TEXT, -- 'annual_drive', 'capital_campaign', 'planned_giving'
  template_config JSONB, -- Timeline, content packs, KPIs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benchmarking data (anonymized, opt-in)
CREATE TABLE church_benchmarks (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  church_id UUID REFERENCES churches(id),
  period_start DATE,
  period_end DATE,
  metrics JSONB, -- {participation_rate, pledge_conversion, recurring_rate, volunteer_hours}
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### New Service Files
- `src/lib/organization-hierarchy.ts` - Org/church management
- `src/lib/stewardship-programs.ts` - Program templates
- `src/lib/benchmarking.ts` - Cross-church metrics

### Phase 2: Campaign & Journey Management (FR-4, FR-5, FR-6, FR-7)

#### Extend Existing + New Tables
```sql
-- Campaigns (reuses events + extends)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  program_id UUID REFERENCES stewardship_programs(id), -- Optional template
  name TEXT NOT NULL,
  campaign_type TEXT, -- 'stewardship_drive', 'capital_campaign', 'volunteer_drive'
  start_date DATE,
  end_date DATE,
  goal_amount DECIMAL(12,2),
  goal_participants INTEGER,
  liturgical_season TEXT, -- 'advent', 'lent', etc.
  status TEXT DEFAULT 'planning',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey templates (extends workflows)
CREATE TABLE journey_templates (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_config JSONB, -- Event triggers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey steps with branching & A/B testing
CREATE TABLE journey_steps (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES journey_templates(id),
  step_order INTEGER,
  step_type TEXT, -- 'invite', 'rsvp', 'pledge_prompt', 'thank_you', 'branch'
  step_config JSONB,
  ab_variant TEXT, -- 'control', 'variant_a', 'variant_b'
  branch_condition JSONB, -- Conditional logic
  delay_config JSONB, -- Timing rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey execution (extends workflow_executions)
CREATE TABLE journey_enrollments (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES journey_templates(id),
  household_id UUID REFERENCES families(id),
  member_id UUID REFERENCES profiles(id),
  campaign_id UUID REFERENCES campaigns(id),
  current_step INTEGER DEFAULT 0,
  ab_variant TEXT,
  status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- RSVP tracking (extends event_registrations)
CREATE TABLE campaign_rsvps (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  event_id UUID REFERENCES events(id),
  household_id UUID REFERENCES families(id),
  rsvp_status TEXT, -- 'yes', 'no', 'maybe'
  attendee_count INTEGER DEFAULT 1,
  dietary_needs TEXT,
  rsvp_date TIMESTAMPTZ DEFAULT NOW()
);
```

#### Updated Service Files
- Extend `src/lib/workflow-automation.ts` → Journey designer
- Extend `src/lib/event-bus.ts` → Campaign event types
- New `src/lib/campaign-manager.ts` - Campaign orchestration
- New `src/lib/journey-designer.ts` - Visual journey builder
- New `src/lib/ab-testing.ts` - Variant management

### Phase 3: Enhanced Pledging (FR-8 through FR-14)

#### Extend Existing Tables
```sql
-- Add time/talent to pledges
ALTER TABLE pledges ADD COLUMN pledge_category TEXT DEFAULT 'treasure'; -- 'time', 'talent', 'treasure'
ALTER TABLE pledges ADD COLUMN skill_offerings TEXT[]; -- For talent pledges
ALTER TABLE pledges ADD COLUMN hours_committed INTEGER; -- For time pledges
ALTER TABLE pledges ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE pledges ADD COLUMN planned_giving_intent BOOLEAN DEFAULT false;

-- Multi-fund pledge splits
CREATE TABLE pledge_fund_allocations (
  id UUID PRIMARY KEY,
  pledge_id UUID REFERENCES pledges(id),
  fund_id UUID REFERENCES funds(id),
  allocation_percentage DECIMAL(5,2),
  allocation_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline gift processing with dual control
CREATE TABLE gift_batches (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  batch_number TEXT NOT NULL,
  batch_date DATE,
  total_amount DECIMAL(12,2),
  gift_count INTEGER,
  entered_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'posted'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link donations to batches
ALTER TABLE donations ADD COLUMN batch_id UUID REFERENCES gift_batches(id);
ALTER TABLE donations ADD COLUMN gift_purpose TEXT; -- Transparency field
```

#### Updated Service Files
- Extend `src/lib/financial-system.ts` - Multi-fund splits
- New `src/lib/pledge-management.ts` - Time/talent/treasure
- New `src/lib/gift-processing.ts` - Dual-control batching
- New `src/lib/planned-giving.ts` - Intent capture workflows

### Phase 4: AI/ML Intelligence (FR-18 through FR-23)

#### New Tables for ML Models
```sql
-- Propensity scoring
CREATE TABLE member_propensity_scores (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES profiles(id),
  household_id UUID REFERENCES families(id),
  model_version TEXT,
  propensity_to_give DECIMAL(5,4), -- 0-1 score
  propensity_to_serve DECIMAL(5,4),
  propensity_to_attend DECIMAL(5,4),
  churn_risk DECIMAL(5,4),
  capacity_tier TEXT, -- 'leadership', 'major', 'regular', 'modest'
  recommended_ask_amount DECIMAL(10,2),
  confidence_score DECIMAL(5,4),
  features_used JSONB, -- Explainability
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Next-Best Action recommendations
CREATE TABLE nba_recommendations (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES profiles(id),
  household_id UUID REFERENCES families(id),
  campaign_id UUID REFERENCES campaigns(id),
  action_type TEXT, -- 'invite_to_serve', 'pledge_prompt', 'recurring_invite', 'thank_you'
  channel TEXT, -- 'email', 'sms', 'call', 'visit'
  priority INTEGER,
  reasoning TEXT,
  optimal_send_time TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test results & attribution
CREATE TABLE journey_analytics (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES journey_templates(id),
  step_id UUID REFERENCES journey_steps(id),
  variant TEXT,
  metric_type TEXT, -- 'open_rate', 'click_rate', 'conversion_rate'
  metric_value DECIMAL(5,4),
  sample_size INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### New Service Files
- `src/lib/ml/propensity-models.ts` - Predictive scoring
- `src/lib/ml/nba-engine.ts` - Next-best action
- `src/lib/ml/send-time-optimizer.ts` - Optimal timing
- `src/lib/ml/anomaly-detection.ts` - Fraud & data quality
- `src/lib/ml/model-explainability.ts` - LIME/SHAP summaries

### Phase 5: Consent & Compliance (FR-31, FR-32, FR-33 + §9, §12)

#### Extend Profiles + New Tables
```sql
-- Enhanced consent management
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES profiles(id),
  consent_type TEXT, -- 'email', 'sms', 'phone', 'profiling', 'data_sharing'
  consent_given BOOLEAN,
  consent_source TEXT, -- 'signup_form', 'website', 'in_person'
  legal_basis TEXT, -- 'consent', 'legitimate_interest', 'contract'
  consent_date TIMESTAMPTZ,
  withdrawn_date TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI decision audit trail
CREATE TABLE ai_decision_log (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES profiles(id),
  decision_type TEXT, -- 'propensity_score', 'nba_recommendation', 'send_time'
  model_name TEXT,
  model_version TEXT,
  input_features JSONB,
  output_decision JSONB,
  explanation TEXT,
  human_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content approval workflow
CREATE TABLE generated_content_approvals (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES generated_content(id),
  campaign_id UUID REFERENCES campaigns(id),
  content_type TEXT, -- 'email', 'sermon_blurb', 'testimony', 'thank_you'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
  assigned_to UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  feedback TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Updated Service Files
- New `src/lib/consent-management.ts` - GDPR compliance
- New `src/lib/content-approval-workflow.ts` - Pastoral review
- Extend `src/lib/audit-logging.ts` - AI decision tracking
- New `src/lib/privacy-controls.ts` - Opt-out management

### Phase 6: Impact Reporting & Transparency (FR-24, FR-25, FR-26)

#### New Tables
```sql
-- Impact stories & narratives
CREATE TABLE impact_stories (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  fund_id UUID REFERENCES funds(id),
  campaign_id UUID REFERENCES campaigns(id),
  title TEXT,
  story TEXT,
  story_type TEXT, -- 'testimony', 'ministry_update', 'campaign_milestone'
  media_urls JSONB,
  is_public BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narrative budget tracking
CREATE TABLE narrative_budget_items (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  budget_id UUID REFERENCES budgets(id),
  category TEXT,
  amount DECIMAL(12,2),
  description TEXT, -- Human-readable purpose
  impact_story_id UUID REFERENCES impact_stories(id),
  visual_config JSONB, -- Chart/infographic settings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Giving statements (extends existing donations)
CREATE TABLE giving_statements (
  id UUID PRIMARY KEY,
  church_id UUID REFERENCES churches(id),
  member_id UUID REFERENCES profiles(id),
  household_id UUID REFERENCES families(id),
  statement_year INTEGER,
  statement_quarter INTEGER,
  total_amount DECIMAL(12,2),
  fund_breakdown JSONB,
  pledge_progress JSONB,
  impact_summary TEXT,
  generated_pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Updated Service Files
- Extend `src/lib/advanced-reporting.ts` - Impact dashboards
- New `src/lib/impact-reporting.ts` - Story-driven metrics
- New `src/lib/statement-generator.ts` - Automated statements
- New `src/lib/transparency-dashboard.ts` - Public-facing reports

---

## Implementation Roadmap

### MVP (90-120 days) - Priority Features

**Database Migrations:**
1. ✅ Organizations & hierarchy
2. ✅ Campaigns & journeys (basic)
3. ✅ Enhanced pledges (time/talent/treasure)
4. ✅ Consent records
5. ✅ Gift batches

**Core Services:**
1. ✅ Organization management
2. ✅ Campaign orchestration
3. ✅ Journey enrollment (extend workflows)
4. ✅ Multi-fund pledge processing
5. ✅ Consent management
6. ✅ Impact story management

**UI Components:**
1. ✅ Campaign dashboard
2. ✅ Journey designer (drag-drop)
3. ✅ Pledge card (time/talent/treasure)
4. ✅ Impact story viewer
5. ✅ Consent preferences

**AI/ML (Basic):**
1. ✅ Propensity scoring v0 (simple model)
2. ✅ Basic NBA rules engine
3. ✅ Giving analyzer tool (enhanced)

### v1.1 (120-180 days) - Advanced Features

**Enhanced ML:**
1. NBA recommendations with send-time optimization
2. Anomaly detection
3. Attribution modeling
4. Churn prediction

**Journey Features:**
1. A/B testing framework
2. Branching logic builder
3. Variant performance analytics

**Additional Modules:**
1. Volunteer-pledge integration
2. Planned giving workflows
3. Benchmarking dashboards
4. Capital campaign templates

### v1.2 (180-240 days) - Generative AI & Compliance

**Generative Content:**
1. AI assistant for admins
2. Content generation with approval workflow
3. Denominational presets
4. Testimony/story drafting

**Compliance & Security:**
1. SOC 2 audit preparation
2. GDPR/CPRA full compliance
3. PCI DSS v4.0 alignment
4. Audit trail enhancements

**Integrations:**
1. Additional payment processors
2. ChMS connectors (Planning Center, CCB, Breeze)
3. Accounting exports
4. Calendar/streaming integrations

---

## Reuse Strategy Summary

### Leverage Existing (60-70% Reuse):
- ✅ Church multi-tenancy foundation
- ✅ Events system → Campaign events
- ✅ Donations/pledges → Extend for time/talent
- ✅ Workflows → Journey designer
- ✅ AI agents → Add NBA/propensity tools
- ✅ Communications → Add A/B testing
- ✅ Reporting → Add impact metrics
- ✅ Audit logging → Extend for compliance

### Build New (30-40% Net New):
- 🆕 Organization hierarchy
- 🆕 Campaign/program templates
- 🆕 Journey branching & A/B testing
- 🆕 ML propensity models
- 🆕 NBA recommendation engine
- 🆕 Consent management
- 🆕 Benchmarking system
- 🆕 Content approval workflows
- 🆕 Impact storytelling

---

## Key Design Principles

1. **Extend, Don't Replace:** Augment existing tables with new columns where possible
2. **Composition Over Duplication:** Link to existing entities (events, members, funds)
3. **JSONB for Flexibility:** Use JSONB for campaign configs, journey metadata, ML features
4. **Event-Driven:** Leverage existing event bus for campaign triggers
5. **Privacy-First:** Consent flags, opt-out mechanisms, audit trails
6. **Faith-Aligned:** Pastoral approval queues, theological presets
7. **Explainable AI:** Store reasoning for all ML decisions
8. **Multi-Tenant Secure:** RLS policies for all new tables

---

## Success Metrics Mapping

| Requirement | Implementation | KPI |
|------------|----------------|-----|
| FR-1: Multi-church | `organizations` table + hierarchy | # churches per org |
| FR-2: Program templates | `stewardship_programs` | Template reuse rate |
| FR-3: Benchmarking | `church_benchmarks` | Opt-in participation |
| FR-4: Event builder | Extend `events` + `campaigns` | Campaign creation time |
| FR-5: Journey designer | `journey_templates` + steps | Journey completion rate |
| FR-6: A/B testing | `journey_steps.ab_variant` | Variant lift % |
| FR-18: Propensity | `member_propensity_scores` | Model accuracy (AUC) |
| FR-19: NBA | `nba_recommendations` | Action conversion rate |
| FR-24: Impact reporting | `impact_stories` + dashboards | Engagement with stories |

---

## Next Steps

1. **Review & Approve** this augmentation strategy
2. **Prioritize** features for MVP vs. v1.1/v1.2
3. **Create** detailed database migration scripts
4. **Design** API contracts for new services
5. **Build** UI wireframes for campaign/journey management
6. **Test** ML models with sample church data
7. **Document** integration patterns for ChMS vendors

---

*This document serves as the master plan for transforming the existing church management system into a comprehensive event-based stewardship platform while maximizing code reuse and maintaining architectural integrity.*
