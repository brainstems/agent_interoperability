# ML Model Integration Guide

## Overview

The Event-Based Stewardship Platform now includes comprehensive ML/AI capabilities integrated with the existing AI agent framework. This guide explains how to use the ML components.

---

## 🤖 ML Components

### 1. **Propensity Models** (`src/lib/ml/propensity-models.ts`)

**Purpose:** Predict member behavior and capacity

**Capabilities:**
- Propensity to give (0-1 score)
- Propensity to serve (volunteer)
- Propensity to attend events
- Churn risk prediction
- Engagement scoring
- Giving capacity tier classification
- Recommended ask amount calculation
- Recurring likelihood prediction

**Usage:**
```typescript
import { propensityModelService } from '@/lib/ml/propensity-models'

// Calculate scores for a member
const scores = await propensityModelService.calculatePropensityScores(
  memberId,
  churchId,
  campaignId // optional
)

console.log(scores.propensity_to_give) // 0.85
console.log(scores.capacity_tier) // 'major_gift'
console.log(scores.recommended_ask_amount) // 2500
```

**Features Analyzed:**
- Giving history (lifetime, 12-month, 6-month)
- Attendance patterns
- Volunteer hours
- Small group membership
- Communication engagement
- Member tenure
- Recurring donor status

### 2. **NBA Engine** (`src/lib/ml/nba-engine.ts`)

**Purpose:** Generate personalized next-best action recommendations

**Recommendation Types:**
- `recurring_ask` - Invite to set up recurring giving
- `re_engagement` - Re-engage lapsed donors
- `invite_to_serve` - Volunteer recruitment
- `thank_you` - Gratitude for recent gifts
- `upgrade_ask` - Increase gift amount
- `pledge_prompt` - Campaign pledge invitation
- `invite_to_event` - Event attendance invitation
- `pastoral_visit` - High-priority pastoral care
- `planned_giving_discussion` - Legacy giving conversation

**Usage:**
```typescript
import { nbaEngine } from '@/lib/ml/nba-engine'

// Generate recommendations
const recommendations = await nbaEngine.generateRecommendations({
  memberId: 'member-123',
  churchId: 'church-456',
  campaignId: 'campaign-789', // optional
  maxRecommendations: 5
})

recommendations.forEach(rec => {
  console.log(`Priority ${rec.action_priority}: ${rec.action_type}`)
  console.log(`Channel: ${rec.recommended_channel}`)
  console.log(`Send at: ${rec.optimal_send_time}`)
  console.log(`Reasoning: ${rec.reasoning}`)
  console.log(`Confidence: ${rec.confidence_score}`)
})
```

**Recommendation Logic:**
- Rule-based scoring (extensible to ML models)
- Priority calculation based on member state
- Channel optimization (email, SMS, phone, in-person)
- Optimal timing integration
- Personalization token generation
- Supporting signal extraction

### 3. **Send-Time Optimizer** (`src/lib/ml/send-time-optimizer.ts`)

**Purpose:** Learn and predict optimal message send times per member

**Capabilities:**
- Optimal day-of-week detection
- Optimal hour-of-day detection
- Device preference tracking (mobile, desktop, tablet)
- Channel-specific optimization (email vs SMS)
- Confidence scoring based on sample size

**Usage:**
```typescript
import { sendTimeOptimizer } from '@/lib/ml/send-time-optimizer'

// Get optimal send time
const optimalTime = await sendTimeOptimizer.getOptimalSendTime(
  memberId,
  'email' // or 'sms'
)

console.log(`Send at: ${optimalTime.toLocaleString()}`)

// Analyze engagement history (run periodically)
const profile = await sendTimeOptimizer.analyzeMemberEngagement(memberId)
console.log(`Optimal days: ${profile.email_optimal_day}`) // ['tuesday', 'thursday']
console.log(`Optimal hour: ${profile.email_optimal_hour}`) // 10
console.log(`Confidence: ${profile.confidence_level}`) // 0.85
```

**Learning Process:**
1. Tracks open/click events from journey executions
2. Analyzes patterns by day-of-week and time-of-day
3. Detects device usage
4. Stores learned profile (expires after 90 days)
5. Continuously updates with new data

### 4. **Anomaly Detection** (`src/lib/ml/anomaly-detection.ts`)

**Purpose:** Detect unusual patterns, fraud, and data quality issues

**Anomaly Types:**
- `unusual_donation_pattern` - Outlier gift amounts
- `duplicate_member` - Potential duplicate records
- `large_variance` - Batch reconciliation issues
- `missing_data` - Data quality problems
- `outlier_behavior` - Sudden engagement changes

**Usage:**
```typescript
import { anomalyDetector } from '@/lib/ml/anomaly-detection'

// Check individual donation
const donationAnomaly = await anomalyDetector.detectDonationAnomaly(
  donationId,
  amount,
  memberId
)

if (donationAnomaly) {
  console.log(`Severity: ${donationAnomaly.severity}`)
  console.log(`Description: ${donationAnomaly.description}`)
  console.log(`Recommended action: ${donationAnomaly.recommendedAction}`)
}

// Check for duplicate members
const duplicates = await anomalyDetector.detectDuplicateMembers(churchId)

// Check batch data quality
const batchIssues = await anomalyDetector.detectBatchDataQuality(batchId, churchId)

// Check engagement anomalies
const engagementAnomaly = await anomalyDetector.detectEngagementAnomaly(memberId, churchId)
```

**Detection Methods:**
- IQR (Interquartile Range) for outliers
- Fuzzy matching for duplicates
- Statistical variance analysis
- Historical baseline comparison

---

## 🛠️ LangChain Tool Integration

All ML models are exposed as LangChain tools for use by AI agents.

### Available ML Tools:

#### 1. **propensity_scorer**
```typescript
// In agent context
const tool = new PropensityScoreTool(churchId)
const result = await tool._call({
  member_id: 'member-123',
  campaign_id: 'campaign-456' // optional
})
```

#### 2. **nba_recommender**
```typescript
const tool = new NBARecommendationTool(churchId)
const result = await tool._call({
  member_id: 'member-123',
  campaign_id: 'campaign-456', // optional
  max_recommendations: 3
})
```

#### 3. **send_time_optimizer**
```typescript
const tool = new SendTimeOptimizerTool(churchId)
const result = await tool._call({
  member_id: 'member-123',
  channel: 'email'
})
```

#### 4. **anomaly_detector**
```typescript
const tool = new AnomalyDetectorTool(churchId)
const result = await tool._call({
  check_type: 'donation',
  target_id: 'donation-789',
  amount: 5000,
  member_id: 'member-123'
})
```

### Using Tools in Agents:

```typescript
import { ChurchToolFactory } from '@/lib/langchain-tools'

// Get ML tools
const propensityTool = ChurchToolFactory.createTool('propensity_scorer', churchId)
const nbaTool = ChurchToolFactory.createTool('nba_recommender', churchId)

// Add to agent tools array
const agent = {
  tools: [
    propensityTool,
    nbaTool,
    // ... other tools
  ]
}
```

---

## 📊 Data Flow

### 1. Feature Extraction
```
Member Data → Propensity Model → Features Extracted
  ↓
- Giving history
- Attendance patterns
- Volunteer hours
- Engagement metrics
  ↓
Stored in ml_feature_store table
```

### 2. Scoring Process
```
Features → ML Model → Propensity Scores
  ↓
Scores stored in member_propensity_scores table
  ↓
Used by NBA Engine
  ↓
Recommendations stored in nba_recommendations table
```

### 3. Continuous Learning
```
User Engagement → Journey Execution → Tracking
  ↓
Send-Time Optimizer analyzes patterns
  ↓
Updates send_time_profiles table
  ↓
Future recommendations use learned times
```

---

## 🎯 Use Cases

### Use Case 1: Campaign Launch
```typescript
// 1. Calculate propensity scores for all members
await propensityModelService.batchCalculateScores(churchId, campaignId)

// 2. Generate NBA recommendations
await nbaEngine.generateCampaignRecommendations(campaignId, churchId)

// 3. Enroll high-propensity members in journey
const highPropensity = await supabase
  .from('member_propensity_scores')
  .select('member_id')
  .eq('campaign_id', campaignId)
  .gt('propensity_to_give', 0.7)

for (const member of highPropensity) {
  await enrollInJourney(journeyId, member.member_id, campaignId)
}
```

### Use Case 2: Donor Re-engagement
```typescript
// 1. Find lapsed donors with low churn risk
const lapsedDonors = await supabase
  .from('member_propensity_scores')
  .select('member_id, churn_risk_score')
  .gt('churn_risk_score', 0.5)
  .lt('churn_risk_score', 0.8)

// 2. Generate personalized re-engagement recommendations
for (const donor of lapsedDonors) {
  const recs = await nbaEngine.generateRecommendations({
    memberId: donor.member_id,
    churchId,
    excludeActionTypes: ['pledge_prompt'] // Focus on re-engagement
  })
  
  // 3. Get optimal send time
  const sendTime = await sendTimeOptimizer.getOptimalSendTime(
    donor.member_id,
    recs[0].recommended_channel
  )
  
  // 4. Schedule communication
  await scheduleMessage(donor.member_id, sendTime, recs[0])
}
```

### Use Case 3: Gift Processing with Anomaly Detection
```typescript
// 1. Create gift batch
const batch = await createGiftBatch(donations)

// 2. Check for anomalies
const anomalies = await anomalyDetector.detectBatchDataQuality(batch.id, churchId)

// 3. Check individual large donations
for (const donation of donations) {
  if (donation.amount > 1000) {
    const anomaly = await anomalyDetector.detectDonationAnomaly(
      donation.id,
      donation.amount,
      donation.donor_id
    )
    
    if (anomaly && anomaly.severity === 'high') {
      // Flag for verification
      await createTask({
        type: 'verify_donation',
        priority: 'high',
        description: anomaly.description
      })
    }
  }
}

// 4. If no critical anomalies, post batch
if (!anomalies.some(a => a.severity === 'critical')) {
  await postBatch(batch.id)
}
```

### Use Case 4: AI Agent Workflow
```typescript
// Agent uses ML tools autonomously
const agent = createStewardshipAgent(churchId)

// Agent prompt: "Find members likely to increase their giving and reach out"
// Agent executes:
// 1. Uses propensity_scorer to find high-propensity members
// 2. Uses nba_recommender to get action recommendations
// 3. Uses send_time_optimizer for timing
// 4. Creates and schedules personalized messages
```

---

## 🔧 Configuration

### Environment Variables (if using external ML service)
```bash
# For production ML models
ML_SERVICE_URL=https://ml-api.example.com
ML_SERVICE_API_KEY=your_api_key
ML_MODEL_ENDPOINT=/predict/propensity

# Feature flags
ENABLE_ML_MODELS=true
ML_BATCH_SIZE=100
ML_SCORE_TTL_DAYS=30
```

### Model Configuration
```typescript
// In propensity-models.ts, replace rule-based logic with ML service call:
async calculatePropensityScores(...) {
  // Option 1: Call external ML service
  const response = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ML_SERVICE_API_KEY}` },
    body: JSON.stringify({ features })
  })
  
  // Option 2: Use TensorFlow.js locally
  const model = await tf.loadLayersModel('file://./models/propensity/model.json')
  const prediction = model.predict(tensorFeatures)
  
  // Option 3: Use current rule-based system (default)
  return this.calculateGivingPropensity(features)
}
```

---

## 📈 Monitoring & Performance

### Model Performance Tracking
```typescript
// Store model metrics
await supabase.from('ml_model_metrics').insert({
  model_name: 'propensity_v1',
  model_version: '1.0',
  accuracy: 0.85,
  auc_roc: 0.88,
  precision_score: 0.82,
  recall: 0.79,
  conversion_rate: 0.45,
  evaluation_dataset_size: 1000,
  is_production_model: true
})
```

### AI Decision Logging
All ML decisions are automatically logged:
```typescript
// Automatically logged in member_propensity_scores table
{
  model_name: 'propensity_v1',
  input_features: { /* all features */ },
  output_decision: { /* scores */ },
  explanation: 'High giving propensity due to...',
  feature_importance: [ /* top factors */ ]
}
```

### Dashboards
- `/app/admin/ml-performance` - Model performance metrics
- `/app/admin/ai-decisions` - AI decision audit trail
- `/app/recommendations` - NBA dashboard (see UI_PAGES_SUMMARY.md)

---

## ✅ Best Practices

1. **Refresh Scores Regularly**
   - Run batch scoring weekly or before campaigns
   - Set appropriate TTL (30 days default)

2. **Monitor Confidence**
   - Only act on high-confidence recommendations (>0.7)
   - Flag low-confidence decisions for human review

3. **A/B Test Recommendations**
   - Compare ML-driven actions vs. control group
   - Track conversion rates in journey_analytics

4. **Explain Decisions**
   - Always include reasoning in communications
   - Store explainability data for audit

5. **Privacy First**
   - Check consent before profiling (opt_out_profiling)
   - Anonymize benchmarking data
   - Log all AI decisions

6. **Human Oversight**
   - Require approval for high-value asks
   - Pastoral review for sensitive actions
   - Override capability for all recommendations

7. **Continuous Improvement**
   - Track NBA recommendation outcomes
   - Update models based on performance
   - Iterate on action rules

---

## 🚀 Next Steps

1. **Run Initial Scoring**
   ```bash
   # Score all members
   npm run ml:score-members
   ```

2. **Generate Campaign Recommendations**
   ```bash
   # For specific campaign
   npm run ml:generate-nbas --campaign-id=xxx
   ```

3. **Analyze Send Times**
   ```bash
   # Build send-time profiles
   npm run ml:analyze-send-times
   ```

4. **Run Anomaly Scan**
   ```bash
   # Full church scan
   npm run ml:scan-anomalies
   ```

5. **Test with AI Agent**
   - Use agents page to test ML tool integration
   - Verify recommendations quality
   - Monitor decision logs

---

## 📚 Related Documentation

- [Database Schema](./supabase/migrations/) - ML tables and indexes
- [API Routes](./API_ROUTES_REQUIRED.md) - ML API endpoints
- [UI Pages](./UI_PAGES_SUMMARY.md) - Recommendations dashboard
- [LangChain Tools](./src/lib/langchain-tools.ts) - Tool implementations

---

**All ML components are now integrated and ready to use!** 🎉

The system provides enterprise-grade ML/AI capabilities while maintaining explainability, privacy controls, and human oversight throughout the stewardship journey.
