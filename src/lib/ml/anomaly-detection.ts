/**
 * Anomaly Detection
 * 
 * Detects unusual patterns in:
 * - Donation amounts (outliers, potential fraud)
 * - Duplicate members
 * - Data quality issues
 * - Unusual behavioral changes
 */

import { createClient } from '@/lib/supabase'

interface AnomalyDetectionResult {
  isAnomaly: boolean
  anomalyType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  anomalyScore: number
  description: string
  expectedValue: any
  actualValue: any
  deviationPercentage: number
  recommendedAction?: string
}

export class AnomalyDetector {
  private supabase = createClient()

  /**
   * Check for anomalous donation
   */
  async detectDonationAnomaly(
    donationId: string,
    amount: number,
    memberId: string
  ): Promise<AnomalyDetectionResult | null> {
    // Get member's donation history
    const { data: donations } = await this.supabase
      .from('donations')
      .select('amount')
      .eq('donor_id', memberId)
      .neq('id', donationId)
      .order('donation_date', { ascending: false })
      .limit(50)

    if (!donations || donations.length < 3) {
      // Not enough history to determine anomaly
      return null
    }

    const amounts = donations.map(d => Number(d.amount))
    const stats = this.calculateStats(amounts)

    // Use IQR method for outlier detection
    const isOutlier = this.isOutlierIQR(amount, stats)
    
    if (isOutlier) {
      const deviation = Math.abs((amount - stats.median) / stats.median) * 100

      return {
        isAnomaly: true,
        anomalyType: 'unusual_donation_pattern',
        severity: this.determineSeverity(deviation),
        anomalyScore: Math.min(deviation / 100, 1),
        description: `Donation amount $${amount} is significantly ${amount > stats.median ? 'higher' : 'lower'} than typical gifts. Member's median gift is $${stats.median.toFixed(2)}.`,
        expectedValue: { median: stats.median, range: [stats.q1, stats.q3] },
        actualValue: amount,
        deviationPercentage: deviation,
        recommendedAction: amount > stats.median * 10 
          ? 'Verify with donor via phone call - potential data entry error or major gift'
          : 'Flag for review'
      }
    }

    return null
  }

  /**
   * Detect duplicate member records
   */
  async detectDuplicateMembers(churchId: string): Promise<AnomalyDetectionResult[]> {
    const { data: members } = await this.supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone')
      .eq('church_id', churchId)
      .eq('is_active', true)

    if (!members) return []

    const anomalies: AnomalyDetectionResult[] = []
    const seen = new Map<string, any>()

    for (const member of members) {
      // Check for exact name match
      const nameKey = `${member.first_name?.toLowerCase()}_${member.last_name?.toLowerCase()}`
      
      if (seen.has(nameKey)) {
        const duplicate = seen.get(nameKey)
        
        // Additional checks
        const emailMatch = member.email && member.email === duplicate.email
        const phoneMatch = member.phone && member.phone === duplicate.phone

        anomalies.push({
          isAnomaly: true,
          anomalyType: 'duplicate_member',
          severity: emailMatch || phoneMatch ? 'high' : 'medium',
          anomalyScore: emailMatch || phoneMatch ? 0.9 : 0.6,
          description: `Potential duplicate: ${member.first_name} ${member.last_name}. ${
            emailMatch ? 'Email matches. ' : ''
          }${phoneMatch ? 'Phone matches. ' : ''}`,
          expectedValue: { unique_members: true },
          actualValue: { member_id_1: duplicate.id, member_id_2: member.id },
          deviationPercentage: 100,
          recommendedAction: 'Review and merge duplicate records if confirmed'
        })
      }

      seen.set(nameKey, member)
    }

    // Store anomalies
    if (anomalies.length > 0) {
      await this.storeAnomalies(churchId, anomalies)
    }

    return anomalies
  }

  /**
   * Detect data quality issues in a batch
   */
  async detectBatchDataQuality(batchId: string, churchId: string): Promise<AnomalyDetectionResult[]> {
    const { data: batch } = await this.supabase
      .from('gift_batches')
      .select('*, donations(*)')
      .eq('id', batchId)
      .single()

    if (!batch) return []

    const anomalies: AnomalyDetectionResult[] = []

    // Check 1: Batch total vs sum of donations
    const donationSum = batch.donations.reduce((sum: number, d: any) => sum + Number(d.amount), 0)
    const batchTotal = Number(batch.total_amount)
    const variance = Math.abs(donationSum - batchTotal)

    if (variance > 0.01) {
      anomalies.push({
        isAnomaly: true,
        anomalyType: 'large_variance',
        severity: variance > 100 ? 'high' : 'medium',
        anomalyScore: Math.min(variance / batchTotal, 1),
        description: `Batch total ($${batchTotal}) does not match sum of donations ($${donationSum}). Variance: $${variance.toFixed(2)}`,
        expectedValue: donationSum,
        actualValue: batchTotal,
        deviationPercentage: (variance / batchTotal) * 100,
        recommendedAction: 'Reconcile batch before posting'
      })
    }

    // Check 2: Unusual number of cash gifts
    const cashGifts = batch.donations.filter((d: any) => d.payment_method === 'CASH')
    const cashPercentage = (cashGifts.length / batch.donations.length) * 100

    if (cashGifts.length > 20 || cashPercentage > 80) {
      anomalies.push({
        isAnomaly: true,
        anomalyType: 'unusual_donation_pattern',
        severity: 'low',
        anomalyScore: cashPercentage / 100,
        description: `Unusually high number of cash gifts: ${cashGifts.length} of ${batch.donations.length} (${cashPercentage.toFixed(1)}%)`,
        expectedValue: { cash_percentage: '< 50%' },
        actualValue: { cash_percentage: cashPercentage },
        deviationPercentage: cashPercentage - 50,
        recommendedAction: 'Verify cash counting procedures'
      })
    }

    // Check 3: Missing data (envelope numbers, check numbers)
    const missingEnvelopes = batch.donations.filter((d: any) => !d.envelope_number).length
    if (missingEnvelopes > batch.donations.length * 0.3) {
      anomalies.push({
        isAnomaly: true,
        anomalyType: 'missing_data',
        severity: 'low',
        anomalyScore: missingEnvelopes / batch.donations.length,
        description: `${missingEnvelopes} of ${batch.donations.length} donations missing envelope numbers`,
        expectedValue: { missing_count: 0 },
        actualValue: { missing_count: missingEnvelopes },
        deviationPercentage: (missingEnvelopes / batch.donations.length) * 100,
        recommendedAction: 'Encourage envelope usage for better tracking'
      })
    }

    // Store anomalies
    if (anomalies.length > 0) {
      await this.storeBatchAnomalies(batchId, churchId, anomalies)
    }

    return anomalies
  }

  /**
   * Detect behavioral anomalies (sudden disengagement)
   */
  async detectEngagementAnomaly(memberId: string, churchId: string): Promise<AnomalyDetectionResult | null> {
    // Compare recent engagement vs historical baseline
    const { data: recentAttendance } = await this.supabase
      .from('event_attendance')
      .select('*')
      .eq('member_id', memberId)
      .gte('event_id', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const { data: historicalAttendance } = await this.supabase
      .from('event_attendance')
      .select('*')
      .eq('member_id', memberId)
      .gte('event_id', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .lt('event_id', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    if (!historicalAttendance || historicalAttendance.length < 5) {
      return null // Not enough history
    }

    const recentRate = (recentAttendance?.length || 0) / 3 // Per month
    const historicalRate = historicalAttendance.length / 9 // Per month average

    const deviation = ((historicalRate - recentRate) / historicalRate) * 100

    if (deviation > 50) { // 50% drop in attendance
      return {
        isAnomaly: true,
        anomalyType: 'outlier_behavior',
        severity: deviation > 80 ? 'high' : 'medium',
        anomalyScore: Math.min(deviation / 100, 1),
        description: `Member attendance has dropped significantly. Historical: ${historicalRate.toFixed(1)} events/month, Recent: ${recentRate.toFixed(1)} events/month`,
        expectedValue: { attendance_rate: historicalRate },
        actualValue: { attendance_rate: recentRate },
        deviationPercentage: deviation,
        recommendedAction: 'Schedule pastoral care visit or personal outreach'
      }
    }

    return null
  }

  /**
   * Statistical helper: Calculate stats for array
   */
  private calculateStats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length

    const mean = sorted.reduce((sum, val) => sum + val, 0) / n
    const median = n % 2 === 0 
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
      : sorted[Math.floor(n / 2)]

    const q1 = sorted[Math.floor(n * 0.25)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const iqr = q3 - q1

    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    return { mean, median, q1, q3, iqr, stdDev, min: sorted[0], max: sorted[n - 1] }
  }

  /**
   * IQR-based outlier detection
   */
  private isOutlierIQR(value: number, stats: ReturnType<typeof this.calculateStats>): boolean {
    const lowerBound = stats.q1 - 1.5 * stats.iqr
    const upperBound = stats.q3 + 1.5 * stats.iqr
    
    return value < lowerBound || value > upperBound
  }

  /**
   * Determine severity based on deviation
   */
  private determineSeverity(deviationPercent: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviationPercent > 500) return 'critical'
    if (deviationPercent > 200) return 'high'
    if (deviationPercent > 100) return 'medium'
    return 'low'
  }

  /**
   * Store anomalies in database
   */
  private async storeAnomalies(churchId: string, anomalies: AnomalyDetectionResult[]) {
    const records = anomalies.map(a => ({
      church_id: churchId,
      anomaly_type: a.anomalyType,
      severity: a.severity,
      description: a.description,
      anomaly_score: a.anomalyScore,
      expected_value: a.expectedValue,
      actual_value: a.actualValue,
      deviation_percentage: a.deviationPercentage,
      detected_by: 'anomaly_detector_v1',
      status: 'new'
    }))

    await this.supabase.from('anomaly_alerts').insert(records)
  }

  /**
   * Store batch-specific anomalies
   */
  private async storeBatchAnomalies(batchId: string, churchId: string, anomalies: AnomalyDetectionResult[]) {
    const records = anomalies.map(a => ({
      church_id: churchId,
      batch_id: batchId,
      anomaly_type: a.anomalyType,
      severity: a.severity,
      description: a.description,
      anomaly_score: a.anomalyScore,
      expected_value: a.expectedValue,
      actual_value: a.actualValue,
      deviation_percentage: a.deviationPercentage,
      detected_by: 'batch_validator_v1',
      status: 'new'
    }))

    await this.supabase.from('anomaly_alerts').insert(records)
  }

  /**
   * Get all active anomalies for a church
   */
  async getActiveAnomalies(churchId: string, severity?: string) {
    let query = this.supabase
      .from('anomaly_alerts')
      .select('*')
      .eq('church_id', churchId)
      .in('status', ['new', 'investigating'])
      .order('severity', { ascending: false })
      .order('detected_at', { ascending: false })

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data } = await query
    return data
  }

  /**
   * Mark anomaly as resolved
   */
  async resolveAnomaly(anomalyId: string, resolution: string, resolvedBy: string) {
    await this.supabase
      .from('anomaly_alerts')
      .update({
        status: 'resolved',
        resolution_notes: resolution,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString()
      })
      .eq('id', anomalyId)
  }

  /**
   * Batch scan for all anomaly types
   */
  async runFullScan(churchId: string) {
    const results = {
      duplicates: await this.detectDuplicateMembers(churchId),
      engagementIssues: [] as AnomalyDetectionResult[],
      dataQualityIssues: [] as AnomalyDetectionResult[]
    }

    // Check recent batches for quality issues
    const { data: recentBatches } = await this.supabase
      .from('gift_batches')
      .select('id')
      .eq('church_id', churchId)
      .eq('status', 'pending')
      .limit(10)

    if (recentBatches) {
      for (const batch of recentBatches) {
        const batchAnomalies = await this.detectBatchDataQuality(batch.id, churchId)
        results.dataQualityIssues.push(...batchAnomalies)
      }
    }

    return results
  }
}

export const anomalyDetector = new AnomalyDetector()
