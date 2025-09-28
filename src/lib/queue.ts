import { EventEmitter } from 'events'
import { ChurchEvent, ChurchEventType } from './events'

export interface QueueJob {
  id: string
  type: string
  data: any
  priority: number
  attempts: number
  maxAttempts: number
  delay: number
  createdAt: Date
  scheduledFor: Date
  processedAt?: Date
  completedAt?: Date
  failedAt?: Date
  error?: string
}

export interface QueueOptions {
  concurrency?: number
  retryDelay?: number
  maxRetries?: number
  defaultPriority?: number
}

export class JobQueue extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map()
  private processing: Set<string> = new Set()
  private options: Required<QueueOptions>
  private isRunning = false
  private processingInterval?: NodeJS.Timeout

  constructor(options: QueueOptions = {}) {
    super()
    this.options = {
      concurrency: options.concurrency || 5,
      retryDelay: options.retryDelay || 5000,
      maxRetries: options.maxRetries || 3,
      defaultPriority: options.defaultPriority || 0
    }
  }

  add(type: string, data: any, options: Partial<Pick<QueueJob, 'priority' | 'delay' | 'maxAttempts'>> = {}): string {
    const id = this.generateJobId()
    const now = new Date()
    
    const job: QueueJob = {
      id,
      type,
      data,
      priority: options.priority || this.options.defaultPriority,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.options.maxRetries,
      delay: options.delay || 0,
      createdAt: now,
      scheduledFor: new Date(now.getTime() + (options.delay || 0))
    }

    this.jobs.set(id, job)
    this.emit('job:added', job)
    
    if (!this.isRunning) {
      this.start()
    }

    return id
  }

  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.processingInterval = setInterval(() => {
      this.processJobs()
    }, 1000)

    this.emit('queue:started')
  }

  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }

    this.emit('queue:stopped')
  }

  private async processJobs(): Promise<void> {
    if (this.processing.size >= this.options.concurrency) {
      return
    }

    const availableJobs = Array.from(this.jobs.values())
      .filter(job => 
        !this.processing.has(job.id) && 
        job.scheduledFor <= new Date() &&
        !job.completedAt &&
        !job.failedAt
      )
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime())

    const jobsToProcess = availableJobs.slice(0, this.options.concurrency - this.processing.size)

    for (const job of jobsToProcess) {
      this.processJob(job)
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    this.processing.add(job.id)
    job.attempts++
    job.processedAt = new Date()

    this.emit('job:started', job)

    try {
      await this.executeJob(job)
      job.completedAt = new Date()
      this.emit('job:completed', job)
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error)
      
      if (job.attempts >= job.maxAttempts) {
        job.failedAt = new Date()
        this.emit('job:failed', job)
      } else {
        // Retry with exponential backoff
        const retryDelay = this.options.retryDelay * Math.pow(2, job.attempts - 1)
        job.scheduledFor = new Date(Date.now() + retryDelay)
        this.emit('job:retry', job)
      }
    } finally {
      this.processing.delete(job.id)
    }
  }

  private async executeJob(job: QueueJob): Promise<void> {
    switch (job.type) {
      case 'send_email':
        await this.sendEmail(job.data)
        break
      case 'send_sms':
        await this.sendSMS(job.data)
        break
      case 'generate_report':
        await this.generateReport(job.data)
        break
      case 'backup_data':
        await this.backupData(job.data)
        break
      case 'sync_external_data':
        await this.syncExternalData(job.data)
        break
      case 'process_donation':
        await this.processDonation(job.data)
        break
      case 'update_member_status':
        await this.updateMemberStatus(job.data)
        break
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  }

  private async sendEmail(data: any): Promise<void> {
    // Simulate email sending
    console.log(`Sending email to ${data.to}: ${data.subject}`)
    await this.delay(1000) // Simulate API call
    
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Email service temporarily unavailable')
    }
  }

  private async sendSMS(data: any): Promise<void> {
    // Simulate SMS sending
    console.log(`Sending SMS to ${data.phone}: ${data.message}`)
    await this.delay(500)
    
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('SMS service error')
    }
  }

  private async generateReport(data: any): Promise<void> {
    console.log(`Generating report: ${data.reportType}`)
    await this.delay(5000) // Simulate long-running task
  }

  private async backupData(data: any): Promise<void> {
    console.log(`Backing up data for church: ${data.churchId}`)
    await this.delay(10000) // Simulate backup process
  }

  private async syncExternalData(data: any): Promise<void> {
    console.log(`Syncing external data from: ${data.source}`)
    await this.delay(3000)
  }

  private async processDonation(data: any): Promise<void> {
    console.log(`Processing donation: $${data.amount} from ${data.memberId}`)
    await this.delay(2000)
    
    // Could integrate with payment processors, generate receipts, etc.
  }

  private async updateMemberStatus(data: any): Promise<void> {
    console.log(`Updating member status: ${data.memberId} -> ${data.status}`)
    await this.delay(1000)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Queue management methods
  getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id)
  }

  getJobs(status?: 'pending' | 'processing' | 'completed' | 'failed'): QueueJob[] {
    const jobs = Array.from(this.jobs.values())
    
    if (!status) return jobs

    return jobs.filter(job => {
      switch (status) {
        case 'pending':
          return !job.processedAt && !job.completedAt && !job.failedAt
        case 'processing':
          return this.processing.has(job.id)
        case 'completed':
          return !!job.completedAt
        case 'failed':
          return !!job.failedAt
        default:
          return false
      }
    })
  }

  removeJob(id: string): boolean {
    if (this.processing.has(id)) {
      return false // Cannot remove job that's currently processing
    }
    
    return this.jobs.delete(id)
  }

  clearCompleted(): number {
    const completedJobs = this.getJobs('completed')
    let removed = 0
    
    for (const job of completedJobs) {
      if (this.jobs.delete(job.id)) {
        removed++
      }
    }
    
    return removed
  }

  getStats() {
    const jobs = Array.from(this.jobs.values())
    
    return {
      total: jobs.length,
      pending: this.getJobs('pending').length,
      processing: this.processing.size,
      completed: this.getJobs('completed').length,
      failed: this.getJobs('failed').length,
      isRunning: this.isRunning
    }
  }
}

// Singleton queue instance
export const jobQueue = new JobQueue({
  concurrency: 10,
  retryDelay: 5000,
  maxRetries: 3
})

// Helper functions for common job types
export class QueueHelpers {
  static scheduleEmail(to: string, subject: string, content: string, delay = 0): string {
    return jobQueue.add('send_email', { to, subject, content }, { delay })
  }

  static scheduleSMS(phone: string, message: string, delay = 0): string {
    return jobQueue.add('send_sms', { phone, message }, { delay })
  }

  static scheduleReport(reportType: string, parameters: any, priority = 1): string {
    return jobQueue.add('generate_report', { reportType, parameters }, { priority })
  }

  static scheduleBackup(churchId: string, priority = 2): string {
    return jobQueue.add('backup_data', { churchId }, { priority })
  }

  static scheduleDonationProcessing(donationData: any, priority = 3): string {
    return jobQueue.add('process_donation', donationData, { priority })
  }

  static scheduleMemberStatusUpdate(memberId: string, status: string): string {
    return jobQueue.add('update_member_status', { memberId, status })
  }
}

// Initialize queue on module load
jobQueue.start()
