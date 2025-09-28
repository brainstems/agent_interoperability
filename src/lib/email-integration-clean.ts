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
  fromName?: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  variables: string[]
}

export interface EmailMessage {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface IncomingEmail {
  messageId: string
  from: string
  to: string
  subject: string
  body: string
  receivedAt: Date
  headers: Record<string, string>
}

export interface EmailAnalysis {
  intent: 'prayer_request' | 'pastoral_care' | 'volunteer_inquiry' | 'event_question' | 'general'
  urgency: 'low' | 'medium' | 'high'
  keywords: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  requiresResponse: boolean
}

export class EmailIntegrationService {
  private transporter: nodemailer.Transporter
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
    this.transporter = this.createTransport()
  }

  private createTransport(): nodemailer.Transporter {
    switch (this.config.provider) {
      case 'smtp':
        return nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port || 587,
          secure: this.config.secure || false,
          auth: {
            user: this.config.username,
            pass: this.config.password
          }
        })
      
      case 'sendgrid':
        return nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: this.config.apiKey
          }
        })
      
      case 'ses':
        // AWS SES configuration would go here
        throw new Error('AWS SES not implemented yet')
      
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`)
    }
  }

  async sendEmail(message: EmailMessage, churchId: string, userId?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${this.config.fromName || 'Church'} <${this.config.fromEmail}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments
      }

      const result = await this.transporter.sendMail(mailOptions)

      // Log successful email
      await this.logEmail({
        churchId,
        userId,
        to: message.to,
        subject: message.subject,
        status: 'SENT'
      })

      return true
    } catch (error) {
      console.error('Failed to send email:', error)

      // Log failed email
      await this.logEmail({
        churchId,
        userId,
        to: message.to,
        subject: message.subject,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return false
    }
  }

  async sendTemplateEmail(
    templateId: string,
    to: string | string[],
    variables: Record<string, string>,
    churchId: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const template = await this.getTemplate(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      let html = template.htmlContent
      let text = template.textContent || ''
      let subject = template.subject

      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`
        html = html.replace(new RegExp(placeholder, 'g'), value)
        text = text.replace(new RegExp(placeholder, 'g'), value)
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
      }

      return await this.sendEmail({
        to,
        subject,
        html,
        text
      }, churchId, userId)
    } catch (error) {
      console.error('Failed to send template email:', error)
      return false
    }
  }

  async processIncomingEmail(email: IncomingEmail, churchId: string): Promise<void> {
    try {
      // Log incoming email
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
          status: 'RECEIVED',
          received_at: email.receivedAt.toISOString()
        })

      // Analyze email content
      const analysis = await this.analyzeEmail(email)

      // Find member by email
      const member = await this.findMemberByEmail(email.from, churchId)

      // Process based on intent
      await this.processEmailIntent(email, analysis, member, churchId)

    } catch (error) {
      console.error('Failed to process incoming email:', error)
    }
  }

  private async analyzeEmail(email: IncomingEmail): Promise<EmailAnalysis> {
    // Simple keyword-based analysis (could be enhanced with AI)
    const subject = email.subject.toLowerCase()
    const body = email.body.toLowerCase()
    const content = `${subject} ${body}`

    let intent: EmailAnalysis['intent'] = 'general'
    let urgency: EmailAnalysis['urgency'] = 'low'
    const keywords: string[] = []

    // Prayer request detection
    if (content.includes('pray') || content.includes('prayer') || content.includes('urgent')) {
      intent = 'prayer_request'
      urgency = 'high'
      keywords.push('prayer')
    }

    // Pastoral care detection
    if (content.includes('counsel') || content.includes('help') || content.includes('support')) {
      intent = 'pastoral_care'
      urgency = 'medium'
      keywords.push('pastoral_care')
    }

    // Volunteer inquiry detection
    if (content.includes('volunteer') || content.includes('serve') || content.includes('ministry')) {
      intent = 'volunteer_inquiry'
      keywords.push('volunteer')
    }

    // Event question detection
    if (content.includes('event') || content.includes('service') || content.includes('meeting')) {
      intent = 'event_question'
      keywords.push('event')
    }

    return {
      intent,
      urgency,
      keywords,
      sentiment: 'neutral', // Could be enhanced with sentiment analysis
      requiresResponse: true
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

  private async processEmailIntent(
    email: IncomingEmail,
    analysis: EmailAnalysis,
    member: any,
    churchId: string
  ): Promise<void> {
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
      case 'event_question':
        await this.createEventFollowUpTask(email, member, churchId)
        break
      default:
        await this.createGeneralFollowUpTask(email, member, churchId)
    }
  }

  private async createPrayerRequestTask(email: IncomingEmail, member: any, churchId: string) {
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Prayer Request: ${email.subject}`,
        description: `Prayer request from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'PRAYER_REQUEST',
        priority: 'HIGH',
        status: 'PENDING',
        member_id: member?.id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
  }

  private async createPastoralCareTask(email: IncomingEmail, member: any, churchId: string) {
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Pastoral Care Needed: ${member?.first_name || email.from}`,
        description: `Pastoral care request:\n\n${email.body}`,
        task_type: 'PASTORAL_CARE',
        priority: 'MEDIUM',
        status: 'PENDING',
        member_id: member?.id,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
      })
  }

  private async createVolunteerFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Volunteer Inquiry: ${member?.first_name || email.from}`,
        description: `Volunteer inquiry:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        status: 'PENDING',
        member_id: member?.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
  }

  private async createEventFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Event Inquiry: ${email.subject}`,
        description: `Event inquiry from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        status: 'PENDING',
        member_id: member?.id,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
      })
  }

  private async createGeneralFollowUpTask(email: IncomingEmail, member: any, churchId: string) {
    await supabase
      .from('tasks')
      .insert({
        church_id: churchId,
        title: `Email Follow-up: ${email.subject}`,
        description: `Follow-up needed for email from ${member?.first_name || email.from}:\n\n${email.body}`,
        task_type: 'FOLLOW_UP',
        priority: 'LOW',
        status: 'PENDING',
        member_id: member?.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
  }

  private async logEmail(data: {
    churchId: string
    userId?: string
    to: string | string[]
    subject: string
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

  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    return data ? {
      id: data.id,
      name: data.name,
      subject: data.subject,
      htmlContent: data.html_content,
      textContent: data.text_content,
      variables: data.variables || []
    } : null
  }

  async getEmailHistory(filters?: {
    churchId: string
    userId?: string
    fromDate?: Date
    toDate?: Date
    status?: string
    limit?: number
  }) {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('church_id', filters?.churchId || '')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50)

    if (filters?.userId) query = query.eq('user_id', filters.userId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.fromDate) query = query.gte('created_at', filters.fromDate.toISOString())
    if (filters?.toDate) query = query.lte('created_at', filters.toDate.toISOString())

    const { data } = await query
    return data || []
  }
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

// Factory function
export function createEmailService(config: EmailConfig): EmailIntegrationService {
  return new EmailIntegrationService(config)
}
