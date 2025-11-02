/**
 * Model Explainability Utilities
 * 
 * Provides human-readable explanations for ML model decisions
 * using SHAP-like feature importance and natural language generation
 */

interface FeatureImportance {
  feature: string
  importance: number
  value: any
  contribution: 'positive' | 'negative' | 'neutral'
}

interface ModelExplanation {
  summary: string
  top_factors: FeatureImportance[]
  detailed_explanation: string
  confidence: number
  recommendation: string
  caveats?: string[]
}

export class ModelExplainer {
  /**
   * Generate human-readable explanation for propensity score
   */
  generatePropensityExplanation(
    score: number,
    features: Record<string, any>,
    featureImportance: { factor: string; importance: number }[]
  ): ModelExplanation {
    const topFactors = this.rankFeatures(features, featureImportance)
    const summary = this.generateSummary('propensity', score, topFactors)
    const detailed = this.generateDetailedExplanation(topFactors, features)
    const recommendation = this.generateRecommendation(score, topFactors)

    return {
      summary,
      top_factors: topFactors,
      detailed_explanation: detailed,
      confidence: this.calculateConfidence(features),
      recommendation,
      caveats: this.generateCaveats(features)
    }
  }

  /**
   * Generate explanation for NBA recommendation
   */
  generateNBAExplanation(
    actionType: string,
    reasoning: string,
    signals: string[],
    propensityScores?: Record<string, number>
  ): ModelExplanation {
    const summary = `Recommended action: ${this.formatActionType(actionType)}`
    const detailed = this.expandReasoning(reasoning, signals, propensityScores)

    return {
      summary,
      top_factors: signals.map((signal, idx) => ({
        feature: signal,
        importance: 1 - (idx * 0.1),
        value: true,
        contribution: 'positive'
      })),
      detailed_explanation: detailed,
      confidence: 0.85, // Would calculate from model
      recommendation: this.generateActionGuidance(actionType),
      caveats: this.generateActionCaveats(actionType)
    }
  }

  /**
   * Generate explanation for anomaly detection
   */
  generateAnomalyExplanation(
    anomalyType: string,
    severity: string,
    expectedValue: any,
    actualValue: any,
    deviation: number
  ): ModelExplanation {
    const summary = `${severity.toUpperCase()} anomaly detected: ${this.formatAnomalyType(anomalyType)}`
    
    const detailed = this.explainAnomaly(anomalyType, expectedValue, actualValue, deviation)

    return {
      summary,
      top_factors: [
        {
          feature: 'deviation',
          importance: 1.0,
          value: `${deviation.toFixed(1)}%`,
          contribution: 'negative'
        },
        {
          feature: 'expected_value',
          importance: 0.8,
          value: expectedValue,
          contribution: 'neutral'
        },
        {
          feature: 'actual_value',
          importance: 0.8,
          value: actualValue,
          contribution: 'negative'
        }
      ],
      detailed_explanation: detailed,
      confidence: this.calculateAnomalyConfidence(deviation),
      recommendation: this.getAnomalyRecommendation(severity, anomalyType)
    }
  }

  /**
   * Rank and format features by importance
   */
  private rankFeatures(
    features: Record<string, any>,
    importance: { factor: string; importance: number }[]
  ): FeatureImportance[] {
    return importance
      .slice(0, 5)
      .map(item => ({
        feature: this.humanizeFeatureName(item.factor),
        importance: item.importance,
        value: features[item.factor],
        contribution: this.determineContribution(item.factor, features[item.factor])
      }))
  }

  /**
   * Convert technical feature names to human-readable
   */
  private humanizeFeatureName(feature: string): string {
    const mapping: Record<string, string> = {
      'giving_history': 'Giving History',
      'attendance_rate': 'Attendance Pattern',
      'recurring_donor': 'Recurring Donor Status',
      'volunteer_engagement': 'Volunteer Participation',
      'small_group_member': 'Small Group Involvement',
      'member_tenure': 'Length of Membership',
      'gift_count_12m': 'Recent Giving Frequency',
      'avg_gift_amount': 'Average Gift Size',
      'email_open_rate': 'Email Engagement',
      'has_recurring': 'Automatic Giving',
      'attendance_rate_12m': 'Church Attendance',
      'volunteer_hours_12m': 'Volunteer Hours'
    }
    
    return mapping[feature] || feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Determine if feature contributes positively or negatively
   */
  private determineContribution(
    feature: string,
    value: any
  ): 'positive' | 'negative' | 'neutral' {
    // Positive indicators
    const positiveFeatures = [
      'giving_history', 'attendance_rate', 'volunteer_engagement',
      'recurring_donor', 'small_group_member', 'has_recurring',
      'gift_count_12m', 'volunteer_hours_12m'
    ]

    // Negative indicators
    const negativeFeatures = [
      'months_since_last_gift', 'churn_risk', 'is_lapsed',
      'days_since_last_interaction'
    ]

    if (positiveFeatures.includes(feature) && value > 0) return 'positive'
    if (negativeFeatures.includes(feature) && value > 0) return 'negative'
    
    return 'neutral'
  }

  /**
   * Generate natural language summary
   */
  private generateSummary(
    modelType: string,
    score: number,
    topFactors: FeatureImportance[]
  ): string {
    const scorePercent = Math.round(score * 100)
    const topFactor = topFactors[0]

    if (modelType === 'propensity') {
      if (score > 0.7) {
        return `High likelihood (${scorePercent}%) driven primarily by ${topFactor.feature.toLowerCase()}.`
      } else if (score > 0.4) {
        return `Moderate likelihood (${scorePercent}%) with ${topFactor.feature.toLowerCase()} as the key factor.`
      } else {
        return `Low likelihood (${scorePercent}%) indicating limited engagement signals.`
      }
    }

    return `Score: ${scorePercent}%`
  }

  /**
   * Generate detailed explanation
   */
  private generateDetailedExplanation(
    topFactors: FeatureImportance[],
    features: Record<string, any>
  ): string {
    const explanations: string[] = []

    topFactors.forEach((factor, idx) => {
      const value = this.formatValue(factor.feature, factor.value)
      const impact = factor.contribution === 'positive' ? 'increases' : 'decreases'
      
      if (idx === 0) {
        explanations.push(
          `The primary driver is **${factor.feature}** (${value}), which significantly ${impact} the likelihood.`
        )
      } else {
        explanations.push(
          `${factor.feature} (${value}) also ${impact} the score.`
        )
      }
    })

    return explanations.join(' ')
  }

  /**
   * Format feature values for display
   */
  private formatValue(feature: string, value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'number') {
      // Percentages
      if (feature.includes('rate') || feature.includes('percentage')) {
        return `${Math.round(value * 100)}%`
      }
      // Counts
      if (feature.includes('count') || feature.includes('hours')) {
        return value.toString()
      }
      // Money
      if (feature.includes('amount') || feature.includes('giving')) {
        return `$${value.toLocaleString()}`
      }
      return value.toFixed(2)
    }
    return String(value)
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(score: number, topFactors: FeatureImportance[]): string {
    if (score > 0.7) {
      return `This member is an excellent candidate for engagement. Consider personalized outreach highlighting their ${topFactors[0].feature.toLowerCase()}.`
    } else if (score > 0.4) {
      return `This member shows moderate potential. A gentle invitation or engagement opportunity would be appropriate.`
    } else {
      return `Focus on building relationship and trust before making asks. Consider pastoral care or fellowship opportunities.`
    }
  }

  /**
   * Generate caveats and limitations
   */
  private generateCaveats(features: Record<string, any>): string[] {
    const caveats: string[] = []

    if (features.member_tenure_months < 12) {
      caveats.push('Limited historical data (member less than 1 year)')
    }

    if (features.gift_count_12m < 3) {
      caveats.push('Sparse giving history may reduce prediction accuracy')
    }

    if (!features.has_recurring && features.gift_count_12m === 0) {
      caveats.push('No recent giving activity - score based primarily on engagement')
    }

    return caveats
  }

  /**
   * Calculate confidence based on data availability
   */
  private calculateConfidence(features: Record<string, any>): number {
    let confidence = 0.5

    if (features.gift_count_12m > 5) confidence += 0.2
    if (features.member_tenure_months > 12) confidence += 0.15
    if (features.attendance_rate_12m > 0.3) confidence += 0.1
    if (features.volunteer_hours_12m > 0) confidence += 0.05

    return Math.min(confidence, 1)
  }

  /**
   * Format action type for display
   */
  private formatActionType(actionType: string): string {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Expand reasoning with additional context
   */
  private expandReasoning(
    reasoning: string,
    signals: string[],
    propensityScores?: Record<string, number>
  ): string {
    let expanded = reasoning + '\n\n**Supporting Evidence:**\n'
    
    signals.forEach(signal => {
      expanded += `- ${signal}\n`
    })

    if (propensityScores) {
      expanded += '\n**Propensity Analysis:**\n'
      Object.entries(propensityScores).forEach(([key, value]) => {
        expanded += `- ${this.humanizeFeatureName(key)}: ${Math.round(value * 100)}%\n`
      })
    }

    return expanded
  }

  /**
   * Generate action-specific guidance
   */
  private generateActionGuidance(actionType: string): string {
    const guidance: Record<string, string> = {
      'recurring_ask': 'Frame as sustainable impact. Emphasize convenience and consistency. Suggest an amount 15% above their average gift.',
      're_engagement': 'Use warm, personal tone. Acknowledge absence without guilt. Share recent impact stories. Focus on relationship restoration.',
      'invite_to_serve': 'Highlight specific opportunities matching their skills. Emphasize community and impact. Make it easy to say yes with clear next steps.',
      'thank_you': 'Be prompt (within 48 hours), personal, and specific. Connect their gift to actual impact. Avoid immediate asks.',
      'upgrade_ask': 'Affirm their faithfulness. Show impact trajectory. Suggest specific increase tied to expanded ministry.',
      'pledge_prompt': 'Provide context on campaign purpose. Share stories of transformation. Make it easy with online pledge card.',
      'pastoral_visit': 'Prioritize listening. Express genuine care. Understand barriers. Avoid transactional approach.'
    }

    return guidance[actionType] || 'Follow best practices for stewardship communication.'
  }

  /**
   * Generate action-specific caveats
   */
  private generateActionCaveats(actionType: string): string[] {
    const caveats: Record<string, string[]> = {
      'recurring_ask': [
        'Not appropriate for first-time donors',
        'Ensure payment method is secure',
        'Provide easy cancellation process'
      ],
      'upgrade_ask': [
        'Verify current financial capacity',
        'Not appropriate within 3 months of last ask',
        'Ensure campaign alignment'
      ],
      'pastoral_visit': [
        'Requires trained pastoral staff',
        'May indicate serious concern',
        'Document pastoral care appropriately'
      ]
    }

    return caveats[actionType] || []
  }

  /**
   * Format anomaly type for display
   */
  private formatAnomalyType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Explain anomaly in detail
   */
  private explainAnomaly(
    type: string,
    expected: any,
    actual: any,
    deviation: number
  ): string {
    const templates: Record<string, string> = {
      'unusual_donation_pattern': `This gift amount (${actual}) deviates ${deviation.toFixed(1)}% from the member's typical giving pattern (median: ${expected.median}). This could indicate a data entry error, a special occasion gift, or a significant life change.`,
      'duplicate_member': `Potential duplicate detected. ${actual.member_id_1} and ${actual.member_id_2} share similar identifying information. This may indicate the same person was entered twice.`,
      'large_variance': `Batch total variance of ${deviation.toFixed(1)}% exceeds acceptable threshold. Expected total: ${expected}, Actual: ${actual}. This requires reconciliation before posting.`,
      'outlier_behavior': `Member's recent activity (${actual.attendance_rate}) shows ${deviation.toFixed(1)}% deviation from historical baseline (${expected.attendance_rate}). This sudden change warrants pastoral attention.`
    }

    return templates[type] || `Anomaly detected with ${deviation.toFixed(1)}% deviation.`
  }

  /**
   * Calculate anomaly confidence
   */
  private calculateAnomalyConfidence(deviation: number): number {
    // Higher deviation = higher confidence it's truly anomalous
    if (deviation > 200) return 0.95
    if (deviation > 100) return 0.85
    if (deviation > 50) return 0.75
    return 0.65
  }

  /**
   * Get recommendation for anomaly
   */
  private getAnomalyRecommendation(severity: string, type: string): string {
    const recommendations: Record<string, Record<string, string>> = {
      'critical': {
        'unusual_donation_pattern': 'STOP: Verify with donor immediately via phone call before processing.',
        'large_variance': 'STOP: Do not post batch. Reconcile discrepancy immediately.',
        'duplicate_member': 'Review and merge records immediately to prevent data corruption.'
      },
      'high': {
        'unusual_donation_pattern': 'Contact donor to confirm amount and intent before proceeding.',
        'duplicate_member': 'Schedule record merge within 48 hours.',
        'outlier_behavior': 'Schedule pastoral care visit within one week.'
      },
      'medium': {
        'unusual_donation_pattern': 'Flag for review before final batch posting.',
        'duplicate_member': 'Add to review queue for manual verification.',
        'missing_data': 'Request complete information from data entry team.'
      },
      'low': {
        'unusual_donation_pattern': 'Note in member record for future reference.',
        'missing_data': 'Clean up data during next maintenance cycle.'
      }
    }

    return recommendations[severity]?.[type] || 'Review and take appropriate action.'
  }
}

export const modelExplainer = new ModelExplainer()
