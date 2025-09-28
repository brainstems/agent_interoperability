import { describe, it, expect, beforeAll } from 'vitest'
import { CrewAIOrchestrator } from '../../src/lib/crewai-orchestrator'

describe('Agent Workflow End-to-End Tests', () => {
  let orchestrator: CrewAIOrchestrator

  beforeAll(async () => {
    orchestrator = new CrewAIOrchestrator()
    // Setup test data: members, attendance, giving records
    await setupTestChurchData()
  })

  it('should complete member retention workflow', async () => {
    const workflow = await orchestrator.executeWorkflow('member_retention', {
      church_id: 'test-church-id',
      agents: ['inactivity_alert_agent', 'at_risk_member_identifier'],
      trigger: 'weekly_check'
    })

    expect(workflow.status).toBe('completed')
    expect(workflow.results).toHaveProperty('inactive_members')
    expect(workflow.results).toHaveProperty('recommended_actions')
    expect(workflow.execution_time).toBeLessThan(30000) // 30 seconds
  })

  it('should execute stewardship analysis workflow', async () => {
    const workflow = await orchestrator.executeWorkflow('stewardship_analysis', {
      church_id: 'test-church-id',
      agents: ['lapsed_donor_reengagement_agent', 'giving_season_optimizer_agent'],
      context: { analysis_period: '3_months' }
    })

    expect(workflow.status).toBe('completed')
    expect(workflow.results.lapsed_donors).toBeDefined()
    expect(workflow.results.recommendations).toBeInstanceOf(Array)
  })

  it('should handle pastoral care workflow', async () => {
    const workflow = await orchestrator.executeWorkflow('pastoral_care', {
      church_id: 'test-church-id',
      agents: ['life_event_tracker_agent', 'milestone_celebration_agent'],
      trigger: 'life_event_detected'
    })

    expect(workflow.status).toBe('completed')
    expect(workflow.results.care_actions).toBeDefined()
    expect(workflow.notifications_sent).toBeGreaterThan(0)
  })
})

async function setupTestChurchData() {
  // Create test members with various engagement patterns
  // Add attendance records, giving history, etc.
}
