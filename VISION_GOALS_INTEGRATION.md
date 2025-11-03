# Vision & Goals Module Integration

## Overview

The Vision & Goals module adds a theological foundation layer to the existing Stewardship Platform. It enables church leaders to craft bold, Scripture-grounded visions, translate them into measurable goals and impact models, and build campaigns that inspire participation through personalized communication.

---

## 🎯 What This Adds

### 1. **Vision Studio** (Leader Tool)
- Author theologically-grounded vision statements
- Ground visions in Scripture and tradition
- Create horizon-based planning (6M, 12M, 24M, 36M)
- Generate supporting materials (FAQs, small group guides, youth summaries)
- AI-assisted narrative drafting with `VisionWeaverAgent`

### 2. **Goals & Impact Models**
- Define measurable targets tied to visions
- Multiple goal types: GIVING_TOTAL, VOL_HOURS, GROUPS, PROJECT_X_DOLLARS
- Track progress in real-time
- Impact Calculator translates giving into tangible outcomes

### 3. **Projects**
- Tangible outcomes that campaigns fund
- Impact metrics (e.g., $100 = 5 meals, $1000 = 1 week shelter)
- Split pledge allocations across multiple projects
- Real-time progress tracking

### 4. **Story Engine**
- Publish impact updates and testimonies
- Multiple story types: testimony, update, milestone, beneficiary, celebration
- Featured stories with media support
- Consent tracking for beneficiary stories

### 5. **Segmented Communication**
- Behavior-based member segments (new givers, lapsed, recurring, etc.)
- Multi-step communication sequences
- Channel-specific content (email, SMS, in-app, small group)
- AI-assisted message drafting with `MessageComposerAgent`

### 6. **Celebration & Accountability**
- Automated milestone detection (25%, 50%, 75%, 100%)
- Thank-you sequences with `ThankYouAgent`
- Quarterly impact receipts showing personal outcomes
- Progress narratives with `ProgressNarratorAgent`

---

## 🗄️ Database Schema

### New Tables (Phase 7 Migration)

```sql
visions                      -- Bold, theologically-grounded vision statements
vision_goals                 -- Measurable targets (giving, volunteers, growth)
projects                     -- Tangible outcomes with impact models
pledge_allocations           -- Split pledges across projects
payment_allocations          -- Track payment-to-project mapping
stories                      -- Impact updates and testimonies
segments                     -- Behavior-based member groupings
segment_members              -- Cached segment membership
comm_sequences               -- Multi-step communication campaigns
sequence_executions          -- Track member progress through sequences
campaign_milestones          -- Achievement markers (50% goal, etc.)
impact_receipts              -- Personalized quarterly/annual reports
```

### Extended Tables
```sql
campaigns.vision_id          -- Link campaigns to visions
pledges.vision_id            -- Link pledges to visions
pledges.fund_code            -- Override default fund allocation
```

---

## 🔗 Integration Points

### With Existing Stewardship Platform

**1. Campaigns Module**
- Campaigns now inherit from Visions
- `campaigns.vision_id` creates parent-child relationship
- Goals feed into campaign targets
- Projects belong to campaigns

**2. Pledges & Donations**
- Pledges can be split across multiple projects via `pledge_allocations`
- Payments tracked to projects via `payment_allocations`
- Impact calculations use actual payments
- All existing pledge/donation functionality preserved

**3. Journeys**
- Vision launch triggers journey enrollments
- Communication sequences integrate with journey framework
- Segmentation drives journey targeting
- Optimal send-time preserved

**4. ML/AI Components**
- Propensity scores inform segment membership
- NBA recommendations include vision-specific actions
- Send-time optimization applies to sequences
- Anomaly detection validates pledge/payment integrity

**5. Analytics**
- Vision goals track via existing KPI infrastructure
- Campaign progress aggregates from donations
- Project impact computes from payment allocations
- All existing dashboards enhanced with vision context

---

## 🤖 AI Agents (Enhanced)

### New Agents

**1. VisionWeaverAgent** (Leader-only)
```typescript
Input: 
  - Theological basis (Scripture, tradition)
  - Ministry strategy & context
  - Current constraints & opportunities

Output:
  - Vision narrative (bold, inspiring)
  - One-sentence anchor
  - FAQ responses
  - Small group discussion guide
  - Youth/kids summaries
  - Leader toolkit

Guardrails:
  - Cites Scripture accurately
  - Avoids guilt/coercion language
  - Aligns with doctrinal profile
  - Maintains hope-filled tone
```

**2. ImpactModelerAgent**
```typescript
Input:
  - Budget lines from Accounting
  - Project goals & scope
  - Historical costs

Output:
  - Impact calculator parameters
  - Conversion rates ($/outcome)
  - Example narratives
  - Transparency notes

Tool Access:
  - Accounting historical data
  - Benchmark comparisons
```

**3. SegmenterAgent**
```typescript
Input:
  - Member behavior data
  - Propensity scores
  - Engagement history

Output:
  - Segment definitions (DSL)
  - Targeting recommendations
  - Expected reach

Segments Suggested:
  - New givers (first gift < 90 days)
  - Lapsed (6-24 months inactive)
  - Recurring donors
  - High propensity non-givers
  - Young adults (age 18-35)
  - Online-first attenders
```

**4. MessageComposerAgent**
```typescript
Input:
  - Vision anchor sentence
  - Channel (email/SMS/push/in-app)
  - Audience segment
  - Sequence step (launch/education/decision/followup)

Output:
  - Subject lines (A/B variants)
  - Message body (tone-appropriate)
  - CTA recommendations
  - Consistency check vs. vision

Guardrails:
  - Maintains vision anchor across channels
  - Avoids coercive language
  - Includes pray-discern-decide posture
  - Respects character limits (SMS)
```

**5. ThankYouAgent**
```typescript
Input:
  - Member's recent gifts
  - Project allocations
  - Impact computed

Output:
  - Personalized thank-you messages
  - Specific outcome references
  - Quarterly impact receipts

Timing:
  - Within 48 hours of gift
  - Quarterly summary
  - Annual roll-up
```

**6. ProgressNarratorAgent**
```typescript
Input:
  - Milestone reached (25%, 50%, etc.)
  - Campaign progress data
  - Recent stories

Output:
  - Celebration update text
  - Short video script
  - Social media tiles
  - Email announcements
```

---

## 📱 UI Components Created

### Leader Pages
1. **`/visions`** - Vision list and studio dashboard
2. **`/visions/new`** - Vision creation wizard (to be built)
3. **`/visions/[id]`** - Vision detail and preview
4. **`/visions/[id]/edit`** - Vision editor (to be built)

### Member Pages
1. **`/v/[slug]`** - Public vision page (to be built)
2. **`/projects/[id]/impact-calculator`** - Impact calculator with slider
3. **`/my-impact`** - Personal pledge progress & outcomes (to be built)

### Existing Pages Enhanced
- **`/campaigns`** - Now shows parent vision
- **`/campaigns/[id]`** - Shows projects and impact calculator link
- **`/pledges`** - Supports project allocation splits

---

## 🔄 Workflows

### A. Vision Creation Flow

```
1. Leader opens Vision Studio
   ↓
2. Enters: Scripture/theology, problem, desired future, why now
   ↓
3. VisionWeaverAgent proposes:
   - 1-sentence anchor
   - 3-point outline
   - FAQs
   - Small group guide
   ↓
4. Add Goals (GIVING_TOTAL=$500k, VOL_HOURS=10k, etc.)
   ↓
5. Save as DRAFT → Review → PUBLISH
   ↓
6. Event: stewardship.vision.published.v1
```

### B. Campaign Launch Flow

```
1. Create Campaign (linked to Vision)
   ↓
2. Define Projects with impact metrics
   ↓
3. ImpactModelerAgent calculates conversion rates
   ↓
4. Compose Communication Sequence:
   - Week 0-2: Vision launch
   - Week 3-6: Education & engagement
   - Week 6-8: Decision & commitment
   - Ongoing: Follow-through & celebration
   ↓
5. SegmenterAgent suggests target audiences
   ↓
6. MessageComposerAgent drafts templates
   ↓
7. Launch Campaign
   ↓
8. Events: stewardship.campaign.launched.v1
```

### C. Member Pledge Flow

```
1. Member receives personalized invite (segmented)
   ↓
2. Views Public Vision Page (/v/slug)
   ↓
3. Uses Impact Calculator to explore outcomes
   ↓
4. Pledge Flow:
   - Choose amount & cadence
   - Optional: Split across projects
   - Confirm → Schedule payments
   ↓
5. Event: stewardship.pledge.created.v1
   ↓
6. ThankYouAgent sends immediate gratitude
   ↓
7. Payments process → Allocations tracked
   ↓
8. Events: stewardship.pledge.fulfilled.v1 (per payment)
```

### D. Milestone Celebration Flow

```
1. Campaign reaches 50% of goal
   ↓
2. Trigger: check_campaign_milestones() function
   ↓
3. Event: stewardship.milestone.reached.v1
   ↓
4. ProgressNarratorAgent generates:
   - Email announcement
   - Social media tiles
   - Video script
   ↓
5. Celebration sequence sent to all supporters
   ↓
6. Story published with photos/video
   ↓
7. Event: stewardship.story.published.v1
```

---

## 📊 Impact Calculator Logic

```typescript
function calculateImpact(project: Project, amountCents: number) {
  const impactValue = (amountCents / 100) * project.impact_per_100_dollars
  
  const narrative = generateNarrative(project, impactValue)
  const examples = generateExamples(project, impactValue)
  
  return {
    impact_value: Math.round(impactValue * 10) / 10,
    impact_unit: project.impact_unit,
    narrative,
    examples
  }
}

// Example output:
// $250 → "You're funding ~7.5 backpacks this quarter"
// Examples:
// - 7 students equipped with school supplies
// - Materials lasting the full academic year
// - Reduced financial stress for 7 families
```

---

## 🎨 Segment DSL Example

```json
{
  "name": "High-Propensity Non-Givers",
  "definition": {
    "all": [
      {"field": "attendance_rate_12m", "op": ">=", "value": 0.5},
      {"field": "small_group_member", "op": "=", "value": true},
      {"field": "propensity_to_give", "op": ">=", "value": 0.7},
      {"field": "giving_history.total_12m", "op": "=", "value": 0}
    ]
  },
  "refresh_frequency": "DAILY"
}
```

**Supported Operators:**
- `=`, `!=`, `>`, `>=`, `<`, `<=` (numeric/date)
- `IN`, `NOT_IN` (arrays)
- `CONTAINS`, `STARTS_WITH` (strings)

**Supported Fields:**
- `role`, `member_status`, `age`, `marital_status`
- `attendance_rate_12m`, `events_attended_6m`
- `giving_history.total_12m`, `gift_count_12m`
- `small_group_member`, `volunteer_hours_12m`
- `propensity_to_give`, `propensity_to_serve`
- `email_open_rate`, `sms_response_rate`

---

## 📧 Communication Sequence Example

```json
{
  "name": "Vision Launch - Every Neighbor Known by Name",
  "sequence_type": "VISION_LAUNCH",
  "schedule": [
    {
      "step": 1,
      "trigger": "immediate",
      "channel": "email",
      "template_id": "vision_announcement",
      "subject": "The next chapter: Every Neighbor Known by Name",
      "personalization": ["first_name", "attendance_rate"]
    },
    {
      "step": 2,
      "trigger": "delay_days:3",
      "channel": "in_app",
      "template_id": "small_group_toolkit",
      "attachment_url": "/toolkits/vision-discussion.pdf"
    },
    {
      "step": 3,
      "trigger": "delay_days:5",
      "channel": "email",
      "template_id": "testimony_story",
      "dynamic_content": "featured_story"
    },
    {
      "step": 4,
      "trigger": "delay_days:7",
      "channel": "sms",
      "template_id": "impact_calculator_invite",
      "condition": {
        "field": "sms_opt_in",
        "op": "=",
        "value": true
      }
    }
  ]
}
```

---

## 🔐 Governance & Ethics

### Transparency Requirements
- **Budget Breakdown**: Show project budgets and admin overhead
- **Impact Model**: Explain conversion rates openly
- **Recognition Timing**: Acknowledge gifts promptly
- **Receipts**: Donation vs. non-deductible delineation

### Consent & Privacy
- **Opt-Out**: Members can hide name from public rolls
- **Sequence Control**: Opt-out of specific communication types
- **Beneficiary Consent**: Required for published stories
- **Data Use**: Check `opt_out_profiling` before AI processing

### Non-Coercion Guardrails
- **Language Checker**: Rejects guilt-based wording
- **Pray-Discern-Decide**: Required framing for asks
- **No Pressure**: Avoid countdown timers or scarcity tactics
- **Transparency**: Clear about financial need vs. aspirational goals

---

## 📈 Analytics & KPIs

### Vision-Level Metrics
- Goal attainment % by horizon
- Run-rate to target
- Pledge conversion by segment
- Average pledge amount
- First-time giver count
- Step-up rate (increased commitments)

### Campaign Metrics
- Project funding distribution
- Donor retention within campaign
- Communication engagement (open/click/CTA)
- A/B test performance
- Fatigue indicators (send caps, unsubscribes)

### Impact Metrics
- Actual outcomes vs. model
- Stories published count
- Volunteer hours correlation with giving
- Quarterly receipt open rates

---

## 🚀 Implementation Checklist

### Phase 1: Database & Core (✅ Complete)
- [x] Run migration 007 (visions, goals, projects, etc.)
- [x] Test foreign key relationships
- [x] Verify RLS policies
- [x] Seed sample vision data

### Phase 2: UI Pages (✅ 75% Complete)
- [x] Vision listing page (`/visions`)
- [x] Vision detail page (`/visions/[id]`)
- [x] Impact calculator (`/projects/[id]/impact-calculator`)
- [ ] Vision editor (`/visions/[id]/edit`)
- [ ] Public vision page (`/v/[slug]`)
- [ ] Personal impact dashboard (`/my-impact`)

### Phase 3: AI Agents (⏳ To Build)
- [ ] Implement VisionWeaverAgent
- [ ] Implement ImpactModelerAgent
- [ ] Implement SegmenterAgent
- [ ] Implement MessageComposerAgent
- [ ] Implement ThankYouAgent
- [ ] Implement ProgressNarratorAgent

### Phase 4: API Routes (⏳ To Build)
- [ ] `/api/visions` (CRUD)
- [ ] `/api/vision-goals` (CRUD + progress)
- [ ] `/api/projects` (CRUD + impact calc)
- [ ] `/api/projects/[id]/impact` (calculator)
- [ ] `/api/stories` (CRUD + publish)
- [ ] `/api/segments` (CRUD + compute)
- [ ] `/api/comm-sequences` (CRUD + execute)
- [ ] `/api/impact-receipts` (generate + send)

### Phase 5: Communication Engine (⏳ To Build)
- [ ] Segment evaluation engine
- [ ] Sequence scheduler
- [ ] Template renderer
- [ ] Multi-channel dispatcher (integrates with existing messaging)

### Phase 6: Celebration & Reporting (⏳ To Build)
- [ ] Milestone detector (triggers)
- [ ] Impact receipt generator
- [ ] Progress narrator
- [ ] Thank-you automations

---

## 🔄 Event Schema

All events follow the platform's event-driven architecture:

```typescript
{
  "id": "evt_123",
  "occurredAt": "2025-11-02T13:46:00Z",
  "tenantId": "church_abc",
  "source": "stewardship-service",
  "schemaVersion": "1",
  "type": "stewardship.vision.published.v1",
  "data": {
    "visionId": "vis_789",
    "title": "Every Neighbor Known by Name",
    "horizon": "24M",
    "goalCount": 3
  }
}
```

**Event Types:**
- `stewardship.vision.published.v1`
- `stewardship.campaign.launched.v1`
- `stewardship.pledge.created.v1`
- `stewardship.pledge.fulfilled.v1`
- `stewardship.story.published.v1`
- `stewardship.milestone.reached.v1`
- `stewardship.segment.message.sent.v1`

---

## 📚 Related Documentation

- **Database Schema**: `supabase/migrations/20251102_007_vision_and_goals.sql`
- **Existing Campaigns**: `UI_PAGES_SUMMARY.md`
- **ML Components**: `ML_INTEGRATION_GUIDE.md`
- **API Specifications**: `API_ROUTES_REQUIRED.md`
- **Main Platform**: `IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Next Steps

1. **Complete UI Pages**: Build vision editor, public page, personal dashboard
2. **Implement AI Agents**: Integrate LangChain tools for all 6 agents
3. **Build API Routes**: ~8 new routes for visions/goals/projects/stories
4. **Test Integration**: End-to-end flow from vision creation → campaign → pledge
5. **Load Sample Data**: Seed example visions, projects, and sequences
6. **User Training**: Create leader guide for Vision Studio

---

**The Vision & Goals module transforms the stewardship platform from transactional to transformational, grounding campaigns in theological vision and making impact tangible through personalized storytelling.** 🎉
