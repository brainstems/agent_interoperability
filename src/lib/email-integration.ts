import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses'
  host?: string
  port?: number
  secure?: boolean
  username?: string
  password?: string
  apiKey?: string
  fromEmail: string
  fromName: string
}

export interface EmailMessage {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface IncomingEmail {
  messageId: string
  from: string
  to: string
  subject: string
  body: string
  html?: string
  receivedAt: Date
  headers: Record<string, string>
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    content: Buffer
  }>
}

export class EmailIntegrationService {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      switch (this.config.provider) {
        case 'smtp':
          this.transporter = nodemailer.createTransport({
            host: this.config.host,
            port: this.config.port || 587,
            secure: this.config.secure || false,
            auth: {
              user: this.config.username,
              pass: this.config.password
            }
          })
          break

        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: this.config.apiKey
            }
          })
          break

        case 'ses':
          // AWS SES configuration would go here
          throw new Error('AWS SES integration not yet implemented')

        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error)
      throw error
    }
  }

  async sendEmail(message: EmailMessage, churchId: string, userId?: string): Promise<string> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized')
    }

    try {
      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc) : undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments
      }

      const result = await this.transporter.sendMail(mailOptions)

      // Log email in database
      await this.logOutgoingEmail({
        churchId,
        userId,
        messageId: result.messageId,
        to: Array.isArray(message.to) ? message.to : [message.to],
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        subject: message.subject,
        content: message.html || message.text || '',
        status: 'SENT'
      })

      return result.messageId
    } catch (error) {
      console.error('Failed to send email:', error)
      
      // Log failed email
      await this.logOutgoingEmail({
        churchId,
        userId,
        messageId: `failed-${Date.now()}`,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        content: message.html || message.text || '',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  async sendBulkEmail(
    messages: EmailMessage[],
    churchId: string,
    userId?: string
  ): Promise<Array<{ messageId?: string; error?: string }>> {
    const results: Array<{ messageId?: string; error?: string }> = []

    for (const message of messages) {
      try {
        const messageId = await this.sendEmail(message, churchId, userId)
        results.push({ messageId })
      } catch (error) {
        results.push({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return results
  }

  async processIncomingEmail(email: IncomingEmail, churchId: string): Promise<void> {
    try {
      // Log incoming email
      const { data: emailLog } = await supabase
        .from('email_logs')
        .insert({
          church_id: churchId,
          message_id: email.messageId,
          from_email: email.from,
          to_email: email.to,
          subject: email.subject,
          body: email.body,
          direction: 'INCOMING',
          status: 'RECEIVED',
          received_at: email.receivedAt.toISOString()
        })
        .select()
        .single()

      // Parse email for member matching
      const member = await this.findMemberByEmail(email.from, churchId)

      // Extract intent and context
      const analysis = await this.analyzeEmailContent(email)

      // Create follow-up tasks or trigger workflows based on content
      await this.processEmailIntent(email, analysis, member, churchId)

      // Update email log with processing results
      if (emailLog) {
        await supabase
          .from('email_logs')
          .update({
            status: 'PROCESSED',
            processed_at: new Date().toISOString(),
            analysis: JSON.stringify(analysis)
          })
          .eq('id', emailLog.id)
      }

    } catch (error) {
      console.error('Failed to process incoming email:', error)
      
      // Log processing error
      await supabase
        .from('email_logs')
        .insert({
          church_id: churchId,
          message_id: email.messageId,
          from_email: email.from,
          to_email: email.to,
          subject: email.subject,
          body: email.body,
          direction: 'INCOMING',
          status: 'ERROR',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          received_at: email.receivedAt.toISOString()
        })
    }
  }

  private async findMemberByEmail(email: string, churchId: string) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('church_id', churchId)
      .eq('email', email.toLowerCase())
      .single()
    
    return data
  }

  private async analyzeEmailContent(email: IncomingEmail): Promise<any> {
    // Basic email analysis - in production, this would use AI/NLP
    const content = (email.body || '').toLowerCase()
    
    const analysis = {
      intent: 'general',
      sentiment: 'neutral',
      urgency: 'normal',
      categories: [] as string[],
      keywords: [] as string[]
    }

    // Intent detection
    if (content.includes('prayer') || content.includes('pray')) {
      analysis.intent = 'prayer_request'
      analysis.categories.push('prayer')
    } else if (content.includes('visit') || content.includes('hospital') || content.includes('sick')) {
      analysis.intent = 'pastoral_care'
      analysis.categories.push('pastoral_care')
    } else if (content.includes('volunteer') || content.includes('serve') || content.includes('help')) {
      analysis.intent = 'volunteer_inquiry'
      analysis.categories.push('volunteer')
    } else if (content.includes('event') || content.includes('meeting') || content.includes('service')) {
      analysis.intent = 'event_inquiry'
      analysis.categories.push('events')
    }

    // Urgency detection
    if (content.includes('urgent') || content.includes('emergency') || content.includes('asap')) {
      analysis.urgency = 'high'
    } else if (content.includes('soon') || content.includes('quickly')) {
      analysis.urgency = 'medium'
    }

    // Sentiment analysis (basic)
    if (content.includes('thank') || content.includes('grateful') || content.includes('bless')) {
      analysis.sentiment = 'positive'
    } else if (content.includes('concern') || content.includes('worry') || content.includes('problem')) {
      analysis.sentiment = 'negative'
    }

    return analysis
  }

  private async processEmailIntent(
    email: IncomingEmail,
    analysis: any,
    member: any,
    churchId: string
  ): Promise<void> {
    try {
      // Create appropriate follow-up tasks based on intent
      switch (analysis.intent) {
        case 'prayer_request':
          await this.createPrayerRequestTask(email, member, churchId)
          break

        case 'pastoral_care':
          await this.createPastoralCareTask(email, member, churchId)
          break

        case 'volunteer_inquiry':
          await this.createVolunteerFollowUpTask(email, member, churchId)
          break

        case 'event_inquiry':
          await this.createEventFollowUpTask(email, member, churchId)
          break

        default:
          await this.createGeneralFollowUpTask(email, member, churchId)
      }

      // Log contact history
      if (member) {
        await supabase
          .from('contact_history')
          .insert({
            church_id: churchId,
            member_id: member.id,
            contact_type: 'EMAIL',
            subject: email.subject,
            notes: email.body,
            contact_date: email.receivedAt.toISOString(),
            follow_up_required: analysis.requiresResponse
          })
      }

    } catch (error) {
      console.error('Failed to process email intent:', error)
    }
  }

  private async createPrayerRequestTask(email: IncomingEmail, member: any, churchId: string) {
    // Find pastoral staff to assign task
    const pastoralStaff = await this.findPastoralStaff(churchId)
    
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Prayer Request: ${email.subject}`,
        description: `Prayer request from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'PRAYER_REQUEST',
        priority: 'HIGH',
        status: 'PENDING',
        assigned_to_id: pastoralStaff?.id,
        member_id: member?.id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
  }

  private async createPastoralCareTask(email: IncomingEmail, member: any, churchId: string) {
    const pastoralStaff = await this.findPastoralStaff(churchId)
    
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Pastoral Care Needed: ${member?.first_name || email.from}`,
        description: `Pastoral care request:\n\n${email.body}`,
        task_type: 'PASTORAL_CARE',
        priority: 'MEDIUM',
        status: 'PENDING',
        assigned_to_id: pastoralStaff?.id,
        member_id: member?.id,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
  }

  private async createVolunteerFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    const volunteerCoordinator = await this.findVolunteerCoordinator(churchId)
    
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Volunteer Inquiry: ${member?.first_name || email.from}`,
        description: `Volunteer inquiry:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        status: 'PENDING',
        assigned_to_id: volunteerCoordinator?.id,
        member_id: member?.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
  }

  private async createEventFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    const eventCoordinator = await this.findEventCoordinator(churchId)
    
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Event Inquiry: ${email.subject}`,
        description: `Event inquiry from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        status: 'PENDING',
        assigned_to_id: eventCoordinator?.id,
        member_id: member?.id,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      })
  }

  private async createGeneralFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    const adminStaff = await this.findAdminStaff(churchId)
    
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Email Follow-up: ${email.subject}`,
        description: `Follow-up needed for email from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'LOW',
        status: 'PENDING',
        assigned_to_id: adminStaff?.id,
        member_id: member?.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
  }

  private async findPastoralStaff(churchId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('church_id', churchId)
      .single()
    
    return data
  }

  private async findVolunteerCoordinator(churchId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('church_id', churchId)
      .single()
    
    return data
  }

  private async findEventCoordinator(churchId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('church_id', churchId)
      .single()
    
    return data
  }

  private async findAdminStaff(churchId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('church_id', churchId)
      .single()
    
    return data
  }

  private async logOutgoingEmail(data: {
    churchId: string
    userId?: string
    messageId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    content: string
    status: 'SENT' | 'FAILED'
    error?: string
  }) {
    await supabase
      .from('email_logs')
      .insert({
        church_id: data.churchId,
        user_id: data.userId,
        to_email: Array.isArray(data.to) ? data.to.join(', ') : data.to,
        subject: data.subject,
        direction: 'OUTGOING',
        status: data.status,
        error_message: data.error,
        sent_at: new Date().toISOString()
      })
  }

  async getEmailHistory(churchId: string, filters?: {
    direction?: 'INCOMING' | 'OUTGOING'
    status?: string
    fromDate?: Date
    toDate?: Date
    limit?: number
    offset?: number
    userId?: string
  }) {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50)
    
    if (filters?.userId) query = query.eq('user_id', filters.userId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.direction) query = query.eq('direction', filters.direction)
    if (filters?.fromDate) query = query.gte('created_at', filters.fromDate.toISOString())
    if (filters?.toDate) query = query.lte('created_at', filters.toDate.toISOString())
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    
    const { data } = await query
    return data || []
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email connection test failed:', error)
      return false
    }
  }
}

// Factory function to create email service instance
export function createEmailService(config: EmailConfig): EmailIntegrationService {
  return new EmailIntegrationService(config)
}

// Default configuration loader
export async function loadEmailConfig(churchId: string): Promise<EmailConfig | null> {
  try {
    // In production, this would load from church settings
    const defaultConfig: EmailConfig = {
      provider: 'smtp',
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      username: process.env.SMTP_USERNAME || '',
      password: process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@church.com',
      fromName: process.env.FROM_NAME || 'Church Management System'
    }

    return defaultConfig
  } catch (error) {
    console.error('Failed to load email config:', error)
    return null
  }
}
