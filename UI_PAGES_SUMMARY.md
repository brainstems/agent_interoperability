# Stewardship Platform - UI Pages Summary

## Overview
This document catalogs all user interface pages created for the Event-Based Stewardship Platform, organized by functional area.

---

## ✅ Completed UI Pages

### 1. **Organization Management**

#### `/app/organizations/page.tsx` ✅
**Purpose:** Manage diocese, network, and church organizational hierarchy

**Features:**
- Organization tree visualization with hierarchical display
- Stats overview (total orgs, active programs, member churches)
- Create new organization modal trigger
- Quick actions for benchmarks, programs, and role management
- Supports multi-level nesting

**Key Components:**
- Organization hierarchy renderer
- Stats cards
- Quick action tiles

---

### 2. **Campaign Management**

#### `/app/campaigns/page.tsx` ✅
**Purpose:** Central hub for managing stewardship campaigns

**Features:**
- Campaign list with grid layout
- Real-time progress tracking (raised vs. goal)
- Visual progress bars
- Campaign stats dashboard (active, raised, participants, completed)
- Status filtering (planning, active, completed, paused)
- Days remaining calculation
- Quick access to journeys and analytics

**Key Components:**
- Campaign cards with progress indicators
- Stats overview grid
- Filter controls
- Campaign type icons and colors

---

### 3. **Journey Designer**

#### `/app/campaigns/[id]/journey/page.tsx` ✅
**Purpose:** Visual journey builder with drag-and-drop capabilities

**Features:**
- Journey template selector (sidebar)
- Step-by-step flow visualization
- A/B variant indicators
- Step editing and deletion
- Communication channel display
- Delay/timing configuration
- Journey activation/pause controls
- Completion rate tracking

**Key Components:**
- Journey sidebar navigation
- Step cards with color coding
- Step connectors (arrows)
- Journey analytics button
- Add step button

---

### 4. **Impact Stories**

#### `/app/impact/page.tsx` ✅
**Purpose:** Manage ministry impact stories and testimonies

**Features:**
- Story grid with featured images
- Story type filtering (testimony, ministry update, transformation, volunteer spotlight, donor impact)
- Impact metrics display (lives impacted, financial impact, volunteer hours)
- Featured story highlighting
- Public/private visibility indicators
- Tag system
- Story editing and sharing

**Key Components:**
- Story cards with images
- Impact metrics grid
- Filter buttons
- Stats overview

---

### 5. **Benchmarking Dashboard**

#### `/app/benchmarking/page.tsx` ✅
**Purpose:** Cross-church performance comparison and insights

**Features:**
- Key metrics comparison cards
- Percentile ranking visualization
- Progress bars for performance
- Org average vs. median comparison
- Trend indicators (up/down/stable)
- Church size filtering
- Time period selection (monthly, quarterly, annual)
- Detailed comparison table
- AI-powered insights and recommendations

**Key Components:**
- Benchmark metric cards
- Comparison table
- Insights section
- Filter controls

---

### 6. **Privacy & Consent Management**

#### `/app/settings/privacy/page.tsx` ✅
**Purpose:** GDPR-compliant privacy preferences and consent management

**Features:**
- Communication opt-in/out toggles (email, SMS, phone, mail)
- AI processing consent controls
- Data profiling opt-out
- Benchmarking participation toggle
- Directory visibility settings (private, church-only, public)
- Photo permission toggle
- Preferred contact method selection
- Active consent history with revoke capability
- Data rights actions (download, correct, delete)
- GDPR notice banner
- Real-time saving indicator

**Key Components:**
- Toggle switches
- Consent record list
- Data rights action cards
- Privacy notice

---

### 7. **AI Recommendations Dashboard**

#### `/app/recommendations/page.tsx` ✅
**Purpose:** Next-best action recommendations powered by AI/ML

**Features:**
- NBA recommendation cards
- Priority badges (high, medium, low)
- Propensity scores visualization (give, serve, attend)
- AI reasoning explanations
- Confidence score display
- Optimal send time suggestions
- Recommended communication channel
- Execute/dismiss actions
- Priority and action type filtering
- Stats overview (total, high priority, avg confidence, completed)

**Key Components:**
- Recommendation cards with propensity bars
- AI reasoning callout boxes
- Priority filtering
- Action buttons (execute/dismiss)

---

### 8. **Program Templates Library**

#### `/app/programs/page.tsx` ✅
**Purpose:** Browse and clone proven stewardship program templates

**Features:**
- Program grid with type filtering
- Featured templates banner
- Program type categorization (annual drive, capital campaign, planned giving, etc.)
- Timeline information display
- Content pack preview (emails, letters, sermons)
- Usage stats (churches using, average rating)
- Clone/use functionality
- Published/draft filtering
- Liturgical alignment indicators
- Create new program wizard

**Key Components:**
- Program cards
- Featured banner
- Type filter pills
- Content pack badges
- Help section with 3-step guide

---

## 📊 Existing Pages (Already in Codebase)

### Financial Management
- `/app/giving/page.tsx` ✅ - Donation tracking and giving trends
- `/app/pledges/page.tsx` ✅ - Pledge management (now supports time/talent/treasure with new DB schema)

### Member & Event Management
- `/app/members/page.tsx` ✅ - Member directory
- `/app/events/page.tsx` ✅ - Event calendar and registration
- `/app/fellowship/page.tsx` ✅ - Fellowship connections
- `/app/groups/page.tsx` ✅ - Small groups management

### Pastoral Care & Tasks
- `/app/pastoral-care/page.tsx` ✅ - Care coordination
- `/app/tasks/page.tsx` ✅ - Task management
- `/app/contact-history/page.tsx` ✅ - Contact logging

### AI & Automation
- `/app/agents/page.tsx` ✅ - AI agent monitoring
- `/app/workflows/page.tsx` ✅ - Workflow automation (can extend for journeys)

### Administration
- `/app/admin/permissions/page.tsx` ✅ - Role management
- `/app/admin/tags/page.tsx` ✅ - Tagging system
- `/app/admin/custom-fields/page.tsx` ✅ - Custom field management
- `/app/admin/audit/page.tsx` ✅ - Audit logs
- `/app/admin/smart-lists/page.tsx` ✅ - Smart segmentation

### General
- `/app/dashboard/page.tsx` ✅ - Main dashboard
- `/app/photos/page.tsx` ✅ - Photo galleries

---

## 🔄 Pages Needing Enhancement

### Update Existing Pages to Support New Features:

1. **`/app/pledges/page.tsx`** - Extend for time/talent/treasure
   - Add pledge category selector
   - Multi-fund allocation UI
   - Skill offerings input for talent
   - Hours commitment for time
   - Planned giving intent checkbox

2. **`/app/giving/page.tsx`** - Add campaign context
   - Link donations to campaigns
   - Show campaign progress
   - Display impact stories

3. **`/app/workflows/page.tsx`** - Journey integration
   - Link to journey designer
   - Show journey enrollments
   - A/B test results

4. **`/app/dashboard/page.tsx`** - Add stewardship metrics
   - Campaign progress widgets
   - AI recommendation highlights
   - Benchmark comparisons
   - Impact story carousel

---

## 🆕 Additional Pages Recommended (Not Yet Built)

### High Priority

1. **`/app/campaigns/[id]/page.tsx`** - Campaign Detail View
   - Progress dashboard
   - Donor/participant list
   - Journey enrollment stats
   - Campaign microsite preview
   - Impact stories linked to campaign

2. **`/app/campaigns/[id]/analytics/page.tsx`** - Campaign Analytics
   - Conversion funnel
   - Channel performance
   - A/B test results
   - Participant demographics
   - Time-series charts

3. **`/app/campaigns/new/page.tsx`** - Campaign Creation Wizard
   - Multi-step form
   - Goal setting
   - Timeline builder
   - Program template selector
   - Initial journey setup

4. **`/app/statements/page.tsx`** - Giving Statements
   - Annual/quarterly statements
   - PDF preview and download
   - Fund breakdown visualization
   - Impact summary inclusion
   - Send statement functionality

5. **`/app/transparency/page.tsx`** - Public Transparency Reports
   - Annual financial reports
   - Narrative budgets
   - Impact metrics
   - Campaign summaries
   - ECFA compliance indicators

### Medium Priority

6. **`/app/programs/[id]/page.tsx`** - Program Detail View
   - Full description
   - Content asset library
   - Success stories
   - Rating/reviews
   - Clone options

7. **`/app/programs/[id]/edit/page.tsx`** - Program Editor
   - Timeline configuration
   - Content asset uploader
   - KPI target setting
   - Best practices editor

8. **`/app/consent-audit/page.tsx`** - Consent Audit Dashboard (Admin)
   - Consent compliance overview
   - Withdrawal tracking
   - Legal basis reporting
   - Expiry monitoring

9. **`/app/ai-decisions/page.tsx`** - AI Decision Audit (Admin)
   - All AI decisions log
   - Model performance metrics
   - Human override tracking
   - Bias detection alerts

10. **`/app/benchmarking/regional/page.tsx`** - Regional Benchmarks
    - Geographic comparisons
    - Denomination-specific metrics
    - Church size cohorts

---

## 📱 Mobile Considerations

All created pages use responsive design with:
- Tailwind CSS grid and flexbox
- Mobile-first breakpoints (md:, lg:)
- Touch-friendly buttons and controls
- Collapsible sidebars on mobile
- Responsive tables with horizontal scroll

**Recommendations:**
- Test on mobile devices
- Consider dedicated mobile navigation
- Add swipe gestures for card interfaces
- Optimize images for mobile bandwidth

---

## 🎨 Design System Consistency

All pages follow established patterns:

**Colors:**
- Primary: Blue (various shades for buttons, highlights)
- Success: Green (positive metrics, approvals)
- Warning: Yellow/Orange (alerts, medium priority)
- Danger: Red (high priority, deletions)
- Info: Purple (features, special content)

**Components:**
- `btn-primary` / `btn-secondary` for actions
- Stat cards with gradient backgrounds
- Shadow-sm borders for cards
- Rounded-lg for containers
- Hover effects on interactive elements

**Icons:**
- Heroicons v2 (24/outline)
- Consistent sizing (h-5 w-5 for inline, h-12 w-12 for decorative)

---

## 🔗 Navigation Integration

### Update Navigation Menu

Add new pages to `/app/layout.tsx` or navigation component:

```typescript
{
  name: 'Campaigns',
  href: '/campaigns',
  icon: MegaphoneIcon
},
{
  name: 'Programs',
  href: '/programs',
  icon: RocketLaunchIcon
},
{
  name: 'Impact Stories',
  href: '/impact',
  icon: SparklesIcon
},
{
  name: 'Benchmarking',
  href: '/benchmarking',
  icon: ChartBarIcon,
  roles: ['admin', 'clergy']
},
{
  name: 'AI Recommendations',
  href: '/recommendations',
  icon: LightBulbIcon,
  roles: ['admin', 'clergy', 'staff']
},
{
  name: 'Organizations',
  href: '/organizations',
  icon: BuildingOffice2Icon,
  roles: ['org_admin', 'admin']
}
```

---

## ✅ Quality Checklist for Each Page

- [x] Responsive design (mobile, tablet, desktop)
- [x] Loading states with spinners
- [x] Empty states with helpful messages
- [x] Error handling (try/catch)
- [x] Accessibility (semantic HTML, ARIA labels)
- [x] Consistent styling
- [x] TypeScript interfaces
- [x] Client-side data fetching
- [x] Filter/search functionality
- [x] Action buttons (create, edit, delete)

---

## 🚀 Next Steps

1. **Create API Routes** for all pages:
   - `/api/organizations`
   - `/api/campaigns`
   - `/api/campaigns/[id]/journeys`
   - `/api/impact-stories`
   - `/api/benchmarking`
   - `/api/privacy/preferences`
   - `/api/recommendations`
   - `/api/programs`

2. **Add Form Modals/Wizards:**
   - Campaign creation modal
   - Journey step editor
   - Impact story form
   - Program builder

3. **Connect to Backend:**
   - Supabase client integration
   - Real data fetching
   - Mutations (create, update, delete)

4. **Add Real-Time Features:**
   - Live campaign progress updates
   - Real-time recommendation notifications
   - Journey execution status

5. **Testing:**
   - Unit tests for components
   - Integration tests for flows
   - E2E tests for critical paths

---

## 📝 Summary

**Total Pages Created:** 8 new pages  
**Existing Pages to Enhance:** 4 pages  
**Recommended Additional Pages:** 10 pages  

**Coverage:**
- ✅ Multi-church organizations
- ✅ Campaign management  
- ✅ Journey designer
- ✅ Impact storytelling
- ✅ Benchmarking analytics
- ✅ Privacy/consent (GDPR)
- ✅ AI recommendations (NBA)
- ✅ Program templates

**Next Priority:**
1. Campaign detail page
2. Campaign creation wizard
3. Giving statements viewer
4. API route implementation

All UI interfaces required for the Event-Based Stewardship Platform MVP are now in place or identified for enhancement!
