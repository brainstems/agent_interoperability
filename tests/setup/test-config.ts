import { beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
export const testConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  testChurch: {
    id: 'test-church-00000000-0000-0000-0000-000000000001',
    name: 'Test Church for Agent Integration'
  },
  agents: {
    timeout: 30000,
    maxConcurrent: 5,
    retryAttempts: 3
  }
}

export const supabaseTest = createClient(
  testConfig.supabase.url,
  testConfig.supabase.serviceKey
)

// Global test setup
beforeAll(async () => {
  // Create test church
  await supabaseTest.from('churches').upsert(testConfig.testChurch)
  
  // Create test members with various patterns
  await createTestMembers()
  
  // Create test attendance records
  await createTestAttendance()
  
  // Create test giving records
  await createTestGiving()
})

afterAll(async () => {
  // Cleanup test data
  await supabaseTest.from('churches').delete().eq('id', testConfig.testChurch.id)
})

async function createTestMembers() {
  const members = [
    {
      id: 'member-active-001',
      church_id: testConfig.testChurch.id,
      first_name: 'Active',
      last_name: 'Member',
      email: 'active@test.com',
      last_attendance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    },
    {
      id: 'member-inactive-001',
      church_id: testConfig.testChurch.id,
      first_name: 'Inactive',
      last_name: 'Member',
      email: 'inactive@test.com',
      last_attendance: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 5 weeks ago
    },
    {
      id: 'member-new-001',
      church_id: testConfig.testChurch.id,
      first_name: 'New',
      last_name: 'Member',
      email: 'new@test.com',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    }
  ]
  
  await supabaseTest.from('profiles').upsert(members)
}

async function createTestAttendance() {
  // Create attendance patterns for testing
}

async function createTestGiving() {
  // Create giving patterns for testing
}
