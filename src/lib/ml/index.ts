/**
 * ML/AI Components Index
 * 
 * Central export point for all machine learning and AI components
 */

// Core ML Services
export { propensityModelService, PropensityModelService } from './propensity-models'
export { nbaEngine, NBAEngine } from './nba-engine'
export { sendTimeOptimizer, SendTimeOptimizer } from './send-time-optimizer'
export { anomalyDetector, AnomalyDetector } from './anomaly-detection'
export { modelExplainer, ModelExplainer } from './model-explainability'

// Re-export services for convenience
import { propensityModelService } from './propensity-models'
import { nbaEngine } from './nba-engine'
import { sendTimeOptimizer } from './send-time-optimizer'
import { anomalyDetector } from './anomaly-detection'
import { modelExplainer } from './model-explainability'

/**
 * ML Service Factory
 * 
 * Convenient access to all ML services
 */
export class MLServices {
  static propensity = propensityModelService
  static nba = nbaEngine
  static sendTime = sendTimeOptimizer
  static anomaly = anomalyDetector
  static explainer = modelExplainer

  /**
   * Run full ML pipeline for a member
   */
  static async analyzeMember(memberId: string, churchId: string, campaignId?: string) {
    // 1. Calculate propensity scores
    const propensityScores = await this.propensity.calculatePropensityScores(
      memberId,
      churchId,
      campaignId
    )

    // 2. Generate NBA recommendations
    const recommendations = await this.nba.generateRecommendations({
      memberId,
      churchId,
      campaignId,
      maxRecommendations: 3
    })

    // 3. Get optimal send time for top recommendation
    const topRec = recommendations[0]
    const optimalTime = topRec 
      ? await this.sendTime.getOptimalSendTime(memberId, topRec.recommended_channel as 'email' | 'sms')
      : null

    // 4. Generate explanation
    const explanation = this.explainer.generatePropensityExplanation(
      propensityScores.propensity_to_give,
      propensityScores.top_influencing_factors as any,
      propensityScores.top_influencing_factors
    )

    return {
      propensityScores,
      recommendations,
      optimalSendTime: optimalTime,
      explanation
    }
  }

  /**
   * Run batch analysis for all members in a church
   */
  static async analyzeChurch(churchId: string, campaignId?: string) {
    // 1. Batch calculate propensity scores
    const propensityResults = await this.propensity.batchCalculateScores(churchId, campaignId)

    // 2. Detect anomalies (duplicates, data quality)
    const anomalies = await this.anomaly.runFullScan(churchId)

    // 3. Build send-time profiles
    const sendTimeResults = await this.sendTime.batchAnalyzeEngagement(churchId)

    return {
      propensityResults,
      anomalies,
      sendTimeResults,
      summary: {
        membersScored: propensityResults?.length || 0,
        anomaliesFound: anomalies.duplicates.length + anomalies.dataQualityIssues.length,
        profilesBuilt: sendTimeResults?.filter((r: any) => r.success).length || 0
      }
    }
  }

  /**
   * Validate donation with anomaly detection
   */
  static async validateDonation(
    donationId: string,
    amount: number,
    memberId: string
  ) {
    const anomaly = await this.anomaly.detectDonationAnomaly(
      donationId,
      amount,
      memberId
    )

    if (anomaly) {
      const explanation = this.explainer.generateAnomalyExplanation(
        anomaly.anomalyType,
        anomaly.severity,
        anomaly.expectedValue,
        anomaly.actualValue,
        anomaly.deviationPercentage
      )

      return {
        isValid: anomaly.severity === 'low',
        requiresReview: ['medium', 'high', 'critical'].includes(anomaly.severity),
        anomaly,
        explanation
      }
    }

    return {
      isValid: true,
      requiresReview: false,
      anomaly: null,
      explanation: null
    }
  }
}

/**
 * Quick access exports
 */
export const ml = MLServices
export default MLServices
