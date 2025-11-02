# Required API Routes for Stewardship Platform UI

This document outlines all API routes needed to support the newly created UI pages.

---

## 1. Organizations API

### `GET /api/organizations`
**Purpose:** Fetch organization hierarchy  
**Query Params:**
- `include_children` (boolean) - Include nested organizations
- `include_stats` (boolean) - Include churches_count, programs_count

**Response:**
```typescript
{
  success: boolean
  organizations: Organization[]
}
```

### `POST /api/organizations`
**Purpose:** Create new organization  
**Body:**
```typescript
{
  name: string
  organization_type: 'diocese' | 'network' | 'denomination'
  parent_id?: string
  description?: string
  settings?: object
}
```

### `GET /api/organizations/[id]`
**Purpose:** Get organization details

### `PUT /api/organizations/[id]`
**Purpose:** Update organization

### `DELETE /api/organizations/[id]`
**Purpose:** Delete organization

---

## 2. Campaigns API

### `GET /api/campaigns`
**Purpose:** List campaigns  
**Query Params:**
- `status` - Filter by status (planning, active, completed, paused)
- `church_id` - Filter by church
- `include` - Comma-separated: 'events,stats,journeys'

**Response:**
```typescript
{
  success: boolean
  campaigns: Campaign[]
  stats: {
    total: number
    active: number
    completed: number
    totalRaised: number
    totalParticipants: number
  }
}
```

### `POST /api/campaigns`
**Purpose:** Create new campaign  
**Body:**
```typescript
{
  name: string
  description?: string
  campaign_type: string
  start_date: string
  end_date: string
  commitment_date?: string
  goal_amount?: number
  goal_participants?: number
  liturgical_season?: string
  program_id?: string
}
```

### `GET /api/campaigns/[id]`
**Purpose:** Get campaign details with progress

**Response:**
```typescript
{
  success: boolean
  campaign: Campaign
  progress: {
    amount_progress: number
    participant_progress: number
    days_remaining: number
    days_elapsed: number
  }
  recent_pledges: Pledge[]
  recent_rsvps: RSVP[]
}
```

### `PUT /api/campaigns/[id]`
**Purpose:** Update campaign

### `DELETE /api/campaigns/[id]`
**Purpose:** Delete campaign

### `GET /api/campaigns/[id]/analytics`
**Purpose:** Get campaign analytics

**Response:**
```typescript
{
  success: boolean
  analytics: {
    conversion_funnel: object
    channel_performance: object[]
    participant_demographics: object
    time_series: object[]
  }
}
```

---

## 3. Journey API

### `GET /api/campaigns/[id]/journeys`
**Purpose:** Get all journeys for a campaign

**Response:**
```typescript
{
  success: boolean
  journeys: Journey[]
}
```

### `POST /api/journeys`
**Purpose:** Create new journey  
**Body:**
```typescript
{
  campaign_id: string
  name: string
  description?: string
  journey_type: string
  trigger_type: string
  enable_ab_testing?: boolean
}
```

### `GET /api/journeys/[id]`
**Purpose:** Get journey with steps

### `PUT /api/journeys/[id]`
**Purpose:** Update journey

### `POST /api/journeys/[id]/steps`
**Purpose:** Add step to journey  
**Body:**
```typescript
{
  step_order: number
  step_name: string
  step_type: string
  ab_variant?: string
  subject_line?: string
  message_content?: string
  communication_channel: string
  delay_type: string
  delay_value?: number
  send_time?: string
}
```

### `PUT /api/journeys/steps/[id]`
**Purpose:** Update journey step

### `DELETE /api/journeys/steps/[id]`
**Purpose:** Delete journey step

### `POST /api/journeys/[id]/activate`
**Purpose:** Activate/pause journey

### `GET /api/journeys/[id]/analytics`
**Purpose:** Get journey performance metrics

---

## 4. Impact Stories API

### `GET /api/impact-stories`
**Purpose:** List impact stories  
**Query Params:**
- `type` - Filter by story type
- `is_public` - Filter public/private
- `is_featured` - Featured only
- `tags` - Filter by tags

**Response:**
```typescript
{
  success: boolean
  stories: ImpactStory[]
  stats: {
    total: number
    published: number
    featured: number
    totalLivesImpacted: number
    totalVolunteerHours: number
  }
}
```

### `POST /api/impact-stories`
**Purpose:** Create impact story  
**Body:**
```typescript
{
  title: string
  subtitle?: string
  story_body: string
  story_type: string
  featured_image_url?: string
  lives_impacted?: number
  financial_impact?: number
  volunteer_hours?: number
  tags?: string[]
  ministry_areas?: string[]
  consent_obtained: boolean
}
```

### `GET /api/impact-stories/[id]`
**Purpose:** Get story details

### `PUT /api/impact-stories/[id]`
**Purpose:** Update story

### `DELETE /api/impact-stories/[id]`
**Purpose:** Delete story

---

## 5. Benchmarking API

### `GET /api/benchmarking`
**Purpose:** Get benchmark data  
**Query Params:**
- `period` - monthly, quarterly, annual
- `size` - Church size category
- `metric` - Specific metric name

**Response:**
```typescript
{
  success: boolean
  benchmarks: BenchmarkData[]
  comparisons: ChurchComparison[]
}
```

### `POST /api/benchmarking/calculate`
**Purpose:** Trigger benchmark calculation for church

### `PUT /api/benchmarking/opt-in`
**Purpose:** Opt church into benchmarking

---

## 6. Privacy & Consent API

### `GET /api/privacy/preferences`
**Purpose:** Get user privacy preferences

**Response:**
```typescript
{
  success: boolean
  preferences: PrivacyPreferences
  consents: ConsentRecord[]
}
```

### `PUT /api/privacy/preferences`
**Purpose:** Update privacy preferences  
**Body:**
```typescript
{
  [key: string]: boolean | string // Any preference field
}
```

### `POST /api/privacy/consent/grant`
**Purpose:** Grant consent  
**Body:**
```typescript
{
  consent_type: string
  legal_basis: string
  consent_source: string
  ip_address?: string
  user_agent?: string
}
```

### `POST /api/privacy/consent/revoke`
**Purpose:** Revoke consent  
**Body:**
```typescript
{
  consent_type: string
  withdrawal_reason?: string
}
```

### `GET /api/privacy/data-export`
**Purpose:** Export user data (GDPR Art. 15)

### `POST /api/privacy/data-deletion`
**Purpose:** Request data deletion (GDPR Art. 17)

---

## 7. AI Recommendations API

### `GET /api/recommendations`
**Purpose:** Get NBA recommendations  
**Query Params:**
- `priority` - Filter by priority (high, medium, low)
- `action` - Filter by action type
- `status` - Filter by status (pending, scheduled, completed)
- `assigned_to` - Filter by assignee

**Response:**
```typescript
{
  success: boolean
  recommendations: NBARecommendation[]
  stats: {
    total: number
    highPriority: number
    avgConfidence: number
    completed: number
  }
}
```

### `POST /api/recommendations/[id]/execute`
**Purpose:** Execute a recommendation

**Body:**
```typescript
{
  scheduled_for?: string
  assigned_to?: string
  notes?: string
}
```

### `POST /api/recommendations/[id]/dismiss`
**Purpose:** Dismiss a recommendation

**Body:**
```typescript
{
  reason?: string
}
```

### `GET /api/recommendations/member/[id]`
**Purpose:** Get top recommendations for specific member

### `POST /api/recommendations/generate`
**Purpose:** Trigger AI to generate new recommendations

---

## 8. Programs API

### `GET /api/programs`
**Purpose:** List program templates  
**Query Params:**
- `type` - Filter by program type
- `published` - Published only
- `organization_id` - Filter by organization

**Response:**
```typescript
{
  success: boolean
  programs: StewardshipProgram[]
}
```

### `POST /api/programs`
**Purpose:** Create new program  
**Body:**
```typescript
{
  name: string
  description: string
  program_type: string
  timeline_config: object
  content_pack?: object
  kpi_targets?: object
  liturgical_alignment?: string
  organization_id?: string
}
```

### `GET /api/programs/[id]`
**Purpose:** Get program details with content assets

### `PUT /api/programs/[id]`
**Purpose:** Update program

### `DELETE /api/programs/[id]`
**Purpose:** Delete program

### `POST /api/programs/[id]/clone`
**Purpose:** Clone program for own use

**Response:**
```typescript
{
  success: boolean
  program: StewardshipProgram
}
```

### `POST /api/programs/[id]/publish`
**Purpose:** Publish program to library

---

## 9. Additional Support Routes

### `GET /api/pledges`
**Purpose:** Enhanced to support time/talent/treasure  
**New Query Params:**
- `category` - Filter by pledge_category
- `campaign_id` - Filter by campaign

### `POST /api/pledges`
**Purpose:** Create pledge with new fields  
**Extended Body:**
```typescript
{
  // Existing fields...
  campaign_id?: string
  pledge_category: 'time' | 'talent' | 'treasure' | 'combined'
  hours_committed?: number
  skill_offerings?: string[]
  ministry_preferences?: string[]
  planned_giving_intent?: boolean
  fund_allocations?: {
    fund_id: string
    allocation_percentage?: number
    allocation_amount?: number
  }[]
}
```

### `GET /api/statements`
**Purpose:** Get giving statements  
**Query Params:**
- `year` - Statement year
- `quarter` - Optional quarter
- `member_id` - Specific member

### `POST /api/statements/generate`
**Purpose:** Generate new statements

### `GET /api/ai-decisions`
**Purpose:** Get AI decision audit log (admin only)

### `GET /api/propensity-scores/[member_id]`
**Purpose:** Get propensity scores for member

---

## 10. Real-Time Subscriptions (Optional)

Using Supabase Realtime:

### Campaign Progress Updates
```typescript
supabase
  .channel('campaign-progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'campaigns'
  }, handleCampaignUpdate)
  .subscribe()
```

### Journey Enrollment Notifications
```typescript
supabase
  .channel('journey-enrollments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'journey_enrollments'
  }, handleNewEnrollment)
  .subscribe()
```

### NBA Recommendations
```typescript
supabase
  .channel('nba-recommendations')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'nba_recommendations',
    filter: `assigned_to=eq.${userId}`
  }, handleNewRecommendation)
  .subscribe()
```

---

## Implementation Priority

### Phase 1 (MVP - Critical)
1. ✅ Campaigns API (all routes)
2. ✅ Journeys API (all routes)
3. ✅ Privacy API (preferences, consent)
4. ✅ Programs API (basic CRUD)

### Phase 2 (Enhanced Features)
5. ✅ Impact Stories API
6. ✅ Recommendations API
7. ✅ Benchmarking API
8. ✅ Organizations API

### Phase 3 (Advanced)
9. ✅ Real-time subscriptions
10. ✅ AI decision audit
11. ✅ Advanced analytics endpoints

---

## Error Handling Standards

All API routes should return consistent error format:

```typescript
{
  success: false,
  error: string,
  code?: string,
  details?: object
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (duplicate)
- 500: Internal Server Error

---

## Authentication & Authorization

All routes require authentication except:
- Public transparency reports
- Public impact stories
- Public campaign microsites

**RLS Policies:**
- Leverage Supabase RLS for data access control
- Already defined in migration files
- API routes should use service role key for admin operations
- User context from JWT for member-specific data

---

## Testing Checklist

For each API route:
- [ ] Unit test for business logic
- [ ] Integration test with database
- [ ] Error handling test cases
- [ ] Authorization test cases
- [ ] Input validation tests
- [ ] Performance/load tests for critical paths

---

**Total Routes Required:** ~50 endpoints  
**Estimated Implementation Time:** 40-60 hours (all routes)  
**Dependencies:** Supabase migrations must be run first

All API routes follow RESTful conventions and support the UI pages created for the Event-Based Stewardship Platform.
