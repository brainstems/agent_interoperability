import { createClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface JobData {
  [key: string]: any
}

export interface Job {
  id: string
  type: string
  data: JobData
  priority: number
  attempts: number
  maxAttempts: number
  delay: number
  scheduledFor: Date
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  error?: string
  result?: any
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
}

export interface JobProcessor {
  (job: Job): Promise<any>
}

export interface QueueOptions {
  concurrency?: number
  retryDelay?: number
  maxRetries?: number
  pollInterval?: number
}

export class JobQueue extends EventEmitter {
  private processors: Map<string, JobProcessor> = new Map()
  private isRunning = false
  private concurrency: number
  private retryDelay: number
  private maxRetries: number
  private pollInterval: number
  private activeJobs = 0
  private pollTimer?: NodeJS.Timeout

  constructor(options: QueueOptions = {}) {
    super()
    this.concurrency = options.concurrency || 5
    this.retryDelay = options.retryDelay || 30000 // 30 seconds
    this.maxRetries = options.maxRetries || 3
    this.pollInterval = options.pollInterval || 5000 // 5 seconds
  }

  // Register a job processor
  process(jobType: string, processor: JobProcessor): void {
    this.processors.set(jobType, processor)
    this.emit('processor-registered', { jobType })
  }

  // Add a job to the queue
  async add(
    type: string,
    data: JobData,
    options: {
      priority?: number
      delay?: number
      maxAttempts?: number
      scheduledFor?: Date
    } = {}
  ): Promise<string> {
    const now = new Date()
    const scheduledFor = options.scheduledFor || 
      (options.delay ? new Date(now.getTime() + options.delay) : now)

    try {
      const { data: job } = await supabase
        .from('job_queue')
        .insert({
          type,
          data,
          priority: options.priority || 0,
          max_attempts: options.maxAttempts || this.maxRetries,
          scheduled_for: scheduledFor.toISOString(),
          status: 'PENDING',
          attempts: 0
        })
        .select()
        .single()

      this.emit('job-added', { jobId: job?.id, type, scheduledFor })
      return job?.id || ''
    } catch (error) {
      this.emit('error', { error, context: 'add-job' })
      throw error
    }
  }

  // Add multiple jobs in bulk
  async addBulk(jobs: Array<{
    type: string
    data: JobData
    priority?: number
    delay?: number
    maxAttempts?: number
    scheduledFor?: Date
  }>): Promise<string[]> {
    const now = new Date()
    
    try {
      const jobData = jobs.map(job => ({
        type: job.type,
        data: job.data,
        priority: job.priority || 0,
        max_attempts: job.maxAttempts || this.maxRetries,
        scheduled_for: (job.scheduledFor || 
          (job.delay ? new Date(now.getTime() + job.delay) : now)).toISOString(),
        status: 'PENDING' as const,
        attempts: 0
      }))

      const { data: createdJobs } = await supabase
        .from('job_queue')
        .insert(jobData)
        .select('id')

      const jobIds = (createdJobs || []).map((job: any) => job.id)
      this.emit('jobs-added', { count: jobIds.length, jobIds })
      return jobIds
    } catch (error) {
      this.emit('error', { error, context: 'add-bulk-jobs' })
      throw error
    }
  }

  // Start processing jobs
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.emit('queue-started')
    this.scheduleNextPoll()
  }

  // Stop processing jobs
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
    }
    this.emit('queue-stopped')
  }

  // Schedule the next poll for jobs
  private scheduleNextPoll(): void {
    if (!this.isRunning) {
      return
    }

    this.pollTimer = setTimeout(() => {
      this.pollForJobs()
    }, this.pollInterval)
  }

  // Poll for and process available jobs
  private async pollForJobs(): Promise<void> {
    try {
      if (this.activeJobs >= this.concurrency) {
        this.scheduleNextPoll()
        return
      }

      const availableSlots = this.concurrency - this.activeJobs
      const jobs = await this.getNextJobs(availableSlots)

      for (const job of jobs) {
        this.processJob(job)
      }

      this.scheduleNextPoll()
    } catch (error) {
      this.emit('error', { error, context: 'poll-jobs' })
      this.scheduleNextPoll()
    }
  }

  // Get the next jobs to process
  private async getNextJobs(limit: number): Promise<Job[]> {
    const now = new Date()

    const { data: jobs } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_for', now.toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(limit)

    // Mark jobs as processing
    if (jobs && jobs.length > 0) {
      await supabase
        .from('job_queue')
        .update({
          status: 'PROCESSING',
          processed_at: now.toISOString()
        })
        .in('id', jobs.map(job => job.id))
    }

    return (jobs || []).map(job => ({
      ...job,
      scheduledFor: new Date(job.scheduled_for),
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at),
      processedAt: job.processed_at ? new Date(job.processed_at) : undefined,
      maxAttempts: job.max_attempts
    })) as Job[]
  }

  // Process a single job
  private async processJob(job: Job): Promise<void> {
    this.activeJobs++
    this.emit('job-started', { jobId: job.id, type: job.type })

    try {
      const processor = this.processors.get(job.type)
      if (!processor) {
        throw new Error(`No processor registered for job type: ${job.type}`)
      }

      const result = await processor(job)

      await supabase
        .from('job_queue')
        .update({
          status: 'COMPLETED',
          result,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      this.emit('job-completed', { jobId: job.id, type: job.type, result })
    } catch (error) {
      await this.handleJobError(job, error)
    } finally {
      this.activeJobs--
    }
  }

  // Handle job processing errors
  private async handleJobError(job: Job, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const newAttempts = job.attempts + 1

    this.emit('job-failed', { 
      jobId: job.id, 
      type: job.type, 
      error: errorMessage, 
      attempts: newAttempts 
    })

    if (newAttempts >= job.maxAttempts) {
      // Job has exceeded max attempts, mark as failed
      await supabase
        .from('job_queue')
        .update({
          status: 'FAILED',
          error: errorMessage,
          attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      this.emit('job-exhausted', { jobId: job.id, type: job.type, error: errorMessage })
    } else {
      // Retry the job after delay
      const retryAt = new Date(Date.now() + this.retryDelay)
      
      await supabase
        .from('job_queue')
        .update({
          status: 'PENDING',
          error: errorMessage,
          attempts: newAttempts,
          scheduled_for: retryAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      this.emit('job-retrying', { 
        jobId: job.id, 
        type: job.type, 
        attempts: newAttempts, 
        retryAt 
      })
    }
  }

  // Cancel a job
  async cancel(jobId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('job_queue')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .in('status', ['PENDING', 'PROCESSING'])
        .select()

      if (data && data.length > 0) {
        this.emit('job-cancelled', { jobId })
        return true
      }
      return false
    } catch (error) {
      this.emit('error', { error, context: 'cancel-job' })
      throw error
    }
  }

  // Get job status
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const { data: job } = await supabase
        .from('job_queue')
        .select('*')
        .eq('id', jobId)
        .single()
      
      if (!job) return null
      
      return {
        ...job,
        scheduledFor: new Date(job.scheduled_for),
        createdAt: new Date(job.created_at),
        updatedAt: new Date(job.updated_at),
        processedAt: job.processed_at ? new Date(job.processed_at) : undefined,
        maxAttempts: job.max_attempts
      } as Job
    } catch (error) {
      this.emit('error', { error, context: 'get-job' })
      throw error
    }
  }

  // Get queue statistics
  async getStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    try {
      const [pending, processing, completed, failed, cancelled, total] = await Promise.all([
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'PENDING').then(r => r.count || 0),
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'PROCESSING').then(r => r.count || 0),
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED').then(r => r.count || 0),
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'FAILED').then(r => r.count || 0),
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'CANCELLED').then(r => r.count || 0),
        supabase.from('job_queue').select('*', { count: 'exact', head: true }).then(r => r.count || 0)
      ])

      return { pending, processing, completed, failed, cancelled, total }
    } catch (error) {
      this.emit('error', { error, context: 'get-stats' })
      throw error
    }
  }

  // Clean up old jobs
  async cleanup(olderThan: Date): Promise<number> {
    try {
      const { data } = await supabase
        .from('job_queue')
        .delete()
        .in('status', ['COMPLETED', 'FAILED', 'CANCELLED'])
        .lt('updated_at', olderThan.toISOString())
        .select()

      const deletedCount = data?.length || 0
      this.emit('cleanup-completed', { deletedCount })
      return deletedCount
    } catch (error) {
      this.emit('error', { error, context: 'cleanup' })
      throw error
    }
  }

  // Get jobs with filters
  async getJobs(filters: {
    status?: string
    type?: string
    limit?: number
    offset?: number
  } = {}): Promise<Job[]> {
    try {
      let query = supabase
        .from('job_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.type) query = query.eq('type', filters.type)
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)

      const { data: jobs } = await query

      return (jobs || []).map(job => ({
        ...job,
        scheduledFor: new Date(job.scheduled_for),
        createdAt: new Date(job.created_at),
        updatedAt: new Date(job.updated_at),
        processedAt: job.processed_at ? new Date(job.processed_at) : undefined,
        maxAttempts: job.max_attempts
      })) as Job[]
    } catch (error) {
      this.emit('error', { error, context: 'get-jobs' })
      throw error
    }
  }
}

// Singleton instance
let queueInstance: JobQueue | null = null

export function getJobQueue(options?: QueueOptions): JobQueue {
  if (!queueInstance) {
    queueInstance = new JobQueue(options)
  }
  return queueInstance
}

// Job type constants
export const JOB_TYPES = {
  SEND_EMAIL: 'send_email',
  PROCESS_WORKFLOW: 'process_workflow',
  GENERATE_REPORT: 'generate_report',
  SYNC_DATA: 'sync_data',
  BACKUP_DATA: 'backup_data',
  SEND_NOTIFICATION: 'send_notification',
  PROCESS_PAYMENT: 'process_payment',
  UPDATE_MEMBER_STATUS: 'update_member_status',
  SCHEDULE_FOLLOW_UP: 'schedule_follow_up',
  AGENT_TASK: 'agent_task'
} as const

// Helper functions for common job types
export async function scheduleEmail(
  to: string | string[],
  subject: string,
  content: string,
  options: {
    delay?: number
    scheduledFor?: Date
    priority?: number
    churchId: string
    userId?: string
  }
): Promise<string> {
  const queue = getJobQueue()
  
  return await queue.add(JOB_TYPES.SEND_EMAIL, {
    to,
    subject,
    content,
    churchId: options.churchId,
    userId: options.userId
  }, {
    delay: options.delay,
    scheduledFor: options.scheduledFor,
    priority: options.priority
  })
}

export async function scheduleWorkflow(
  workflowId: string,
  triggerData: any,
  options: {
    delay?: number
    scheduledFor?: Date
    priority?: number
  } = {}
): Promise<string> {
  const queue = getJobQueue()
  
  return await queue.add(JOB_TYPES.PROCESS_WORKFLOW, {
    workflowId,
    triggerData
  }, options)
}

export async function scheduleFollowUp(
  taskData: {
    title: string
    description: string
    taskType: string
    assignedTo: string
    memberId?: string
    churchId: string
    priority?: string
  },
  delay: number
): Promise<string> {
  const queue = getJobQueue()
  
  return await queue.add(JOB_TYPES.SCHEDULE_FOLLOW_UP, taskData, {
    delay,
    priority: 1
  })
}

export async function scheduleAgentTask(
  agentType: string,
  purpose: string,
  context: any,
  options: {
    delay?: number
    scheduledFor?: Date
    priority?: number
    churchId: string
  }
): Promise<string> {
  const queue = getJobQueue()
  
  return await queue.add(JOB_TYPES.AGENT_TASK, {
    agentType,
    purpose,
    context,
    churchId: options.churchId
  }, {
    delay: options.delay,
    scheduledFor: options.scheduledFor,
    priority: options.priority
  })
}
