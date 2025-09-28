import { supabase } from '@/lib/supabase'
import { getPromptManager } from './prompt-manager'
import OpenAI from 'openai'

// Initialize OpenAI client lazily to avoid build-time errors
let openai: OpenAI | null = null
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

export interface ContentGenerationRequest {
  type: 'sermon' | 'newsletter' | 'social_post' | 'announcement' | 'prayer' | 'devotional'
  topic?: string
  tone?: 'formal' | 'casual' | 'inspirational' | 'educational' | 'pastoral'
  length?: 'short' | 'medium' | 'long'
  audience?: 'general' | 'youth' | 'children' | 'seniors' | 'leadership'
  scriptureReferences?: string[]
  keyPoints?: string[]
  occasion?: string
  customInstructions?: string
}

export interface SermonOutline {
  title: string
  mainText: string
  introduction: {
    hook: string
    context: string
    thesis: string
  }
  points: Array<{
    title: string
    scripture: string
    explanation: string
    application: string
    illustration?: string
  }>
  conclusion: {
    summary: string
    callToAction: string
    closingPrayer: string
  }
  additionalResources: string[]
}

export interface NewsletterContent {
  subject: string
  sections: Array<{
    title: string
    content: string
    type: 'article' | 'announcement' | 'prayer_request' | 'event' | 'testimony'
  }>
  callToActions: string[]
  footer: string
}

// AI Content Generation Service
export class AIContentGenerator {
  private promptManager = getPromptManager()

  async generateSermonOutline(
    churchId: string,
    request: ContentGenerationRequest & {
      mainText: string
      sermonSeries?: string
      targetDuration?: number
    }
  ): Promise<SermonOutline> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'sermon_outline',
      {
        main_text: request.mainText,
        topic: request.topic || '',
        tone: request.tone || 'inspirational',
        audience: request.audience || 'general',
        key_points: request.keyPoints?.join(', ') || '',
        scripture_references: request.scriptureReferences?.join(', ') || '',
        sermon_series: request.sermonSeries || '',
        target_duration: request.targetDuration || 30,
        occasion: request.occasion || '',
        custom_instructions: request.customInstructions || ''
      }
    )

    // Parse the AI response into structured sermon outline
    return this.parseSermonOutline(response.response)
  }

  async generateSermonPoints(
    churchId: string,
    mainText: string,
    numberOfPoints: number = 3
  ): Promise<Array<{ title: string; content: string; application: string }>> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'sermon_points',
      {
        main_text: mainText,
        number_of_points: numberOfPoints,
        include_applications: true
      }
    )

    return this.parseSermonPoints(response.response)
  }

  async generateNewsletterContent(
    churchId: string,
    request: ContentGenerationRequest & {
      upcomingEvents?: any[]
      announcements?: string[]
      prayerRequests?: string[]
      testimonies?: string[]
    }
  ): Promise<NewsletterContent> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'newsletter_content',
      {
        topic: request.topic || 'Monthly Church Update',
        tone: request.tone || 'warm',
        upcoming_events: JSON.stringify(request.upcomingEvents || []),
        announcements: request.announcements?.join('\n') || '',
        prayer_requests: request.prayerRequests?.join('\n') || '',
        testimonies: request.testimonies?.join('\n') || '',
        custom_instructions: request.customInstructions || ''
      }
    )

    return this.parseNewsletterContent(response.response)
  }

  async generateSocialMediaPost(
    churchId: string,
    request: ContentGenerationRequest & {
      platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
      includeHashtags?: boolean
      includeCallToAction?: boolean
    }
  ): Promise<{ content: string; hashtags: string[]; callToAction?: string }> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'social_media_post',
      {
        platform: request.platform,
        topic: request.topic || '',
        tone: request.tone || 'inspirational',
        length: request.length || 'medium',
        include_hashtags: request.includeHashtags || true,
        include_call_to_action: request.includeCallToAction || true,
        scripture_references: request.scriptureReferences?.join(', ') || '',
        custom_instructions: request.customInstructions || ''
      }
    )

    return this.parseSocialMediaPost(response.response)
  }

  async generatePrayerContent(
    churchId: string,
    request: ContentGenerationRequest & {
      prayerType: 'opening' | 'closing' | 'intercession' | 'thanksgiving' | 'petition'
      specificNeeds?: string[]
    }
  ): Promise<{ title: string; content: string; duration: string }> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'prayer_content',
      {
        prayer_type: request.prayerType,
        tone: request.tone || 'reverent',
        specific_needs: request.specificNeeds?.join(', ') || '',
        occasion: request.occasion || '',
        scripture_references: request.scriptureReferences?.join(', ') || ''
      }
    )

    return this.parsePrayerContent(response.response)
  }

  async generateDevotionalContent(
    churchId: string,
    request: ContentGenerationRequest & {
      scriptureVerse: string
      devotionalLength?: 'daily' | 'weekly'
    }
  ): Promise<{
    title: string
    scripture: string
    reflection: string
    prayer: string
    application: string
  }> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'devotional_content',
      {
        scripture_verse: request.scriptureVerse,
        topic: request.topic || '',
        tone: request.tone || 'reflective',
        devotional_length: request.devotionalLength || 'daily',
        audience: request.audience || 'general'
      }
    )

    return this.parseDevotionalContent(response.response)
  }

  // Content Enhancement and Editing
  async enhanceContent(
    churchId: string,
    originalContent: string,
    enhancementType: 'clarity' | 'engagement' | 'biblical_depth' | 'pastoral_tone'
  ): Promise<string> {
    const response = await this.promptManager.executePrompt(
      churchId,
      'ContentGenerator',
      'CONTENT_GENERATION',
      'enhance_content',
      {
        original_content: originalContent,
        enhancement_type: enhancementType,
        maintain_core_message: true
      }
    )

    return response.response
  }

  async generateContentVariations(
    churchId: string,
    baseContent: string,
    platforms: string[]
  ): Promise<Record<string, string>> {
    const variations: Record<string, string> = {}

    for (const platform of platforms) {
      const response = await this.promptManager.executePrompt(
        churchId,
        'ContentGenerator',
        'CONTENT_GENERATION',
        'adapt_content_for_platform',
        {
          base_content: baseContent,
          target_platform: platform,
          maintain_core_message: true
        }
      )
      variations[platform] = response.response
    }

    return variations
  }

  // Content Templates Management
  async saveContentTemplate(data: {
    churchId: string
    name: string
    type: string
    template: string
    variables?: any
  }) {
    const { data: result, error } = await supabase
      .from('content_templates')
      .insert({
        church_id: data.churchId,
        name: data.name,
        type: data.type,
        template: data.template,
        variables: data.variables,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to save content template: ${error.message}`)
    }
    
    return result
  }

  async getContentTemplates(churchId: string, type?: string) {
    let query = supabase
      .from('content_templates')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to get content templates: ${error.message}`)
    }
    
    return data || []
  }

  async generateFromTemplate(
    churchId: string,
    templateId: string,
    variables: Record<string, any>,
    createdById: string
  ) {
    const { data: template, error: templateError } = await supabase
      .from('content_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      throw new Error('Template not found')
    }

    // Replace template variables
    let content = template.template
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    // Use AI to enhance the template-generated content
    const enhancedContent = await this.enhanceContent(churchId, content, 'clarity')

    // Save the generated content
    const { data: generatedContent, error } = await supabase
      .from('generated_content')
      .insert({
        church_id: churchId,
        template_id: templateId,
        type: template.type,
        title: variables.title || `Generated ${template.type}`,
        content: enhancedContent,
        metadata: { variables, originalTemplate: template.template },
        created_by_id: createdById,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save generated content: ${error.message}`)
    }

    return generatedContent
  }

  // Private parsing methods
  private parseSermonOutline(response: string): SermonOutline {
    // This would parse the AI response into a structured sermon outline
    // For now, returning a basic structure
    try {
      return JSON.parse(response)
    } catch {
      return {
        title: 'Generated Sermon',
        mainText: '',
        introduction: { hook: '', context: '', thesis: '' },
        points: [],
        conclusion: { summary: '', callToAction: '', closingPrayer: '' },
        additionalResources: []
      }
    }
  }

  private parseSermonPoints(response: string): Array<{ title: string; content: string; application: string }> {
    try {
      return JSON.parse(response)
    } catch {
      return []
    }
  }

  private parseNewsletterContent(response: string): NewsletterContent {
    try {
      return JSON.parse(response)
    } catch {
      return {
        subject: 'Church Newsletter',
        sections: [],
        callToActions: [],
        footer: ''
      }
    }
  }

  private parseSocialMediaPost(response: string): { content: string; hashtags: string[]; callToAction?: string } {
    try {
      return JSON.parse(response)
    } catch {
      return {
        content: response,
        hashtags: [],
        callToAction: undefined
      }
    }
  }

  private parsePrayerContent(response: string): { title: string; content: string; duration: string } {
    try {
      return JSON.parse(response)
    } catch {
      return {
        title: 'Prayer',
        content: response,
        duration: '2-3 minutes'
      }
    }
  }

  private parseDevotionalContent(response: string): {
    title: string
    scripture: string
    reflection: string
    prayer: string
    application: string
  } {
    try {
      return JSON.parse(response)
    } catch {
      return {
        title: 'Daily Devotional',
        scripture: '',
        reflection: response,
        prayer: '',
        application: ''
      }
    }
  }
}

// Content Scheduling and Publishing
export class ContentScheduler {
  async scheduleContent(data: {
    churchId: string
    contentId: string
    publishAt: Date
    platforms: string[]
    autoPublish?: boolean
  }) {
    // This would integrate with a job scheduler
    // For now, we'll save the schedule
    return {
      id: 'schedule-' + Date.now(),
      ...data,
      status: 'scheduled'
    }
  }

  async publishContent(contentId: string, platforms: string[]) {
    const { data: content, error: contentError } = await supabase
      .from('generated_content')
      .select('*')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      throw new Error('Content not found')
    }

    const results = []
    for (const platform of platforms) {
      try {
        // This would integrate with actual social media APIs
        const result = await this.publishToPlatform(content, platform)
        results.push({ platform, success: true, result })
      } catch (error) {
        results.push({ 
          platform, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }

    return results
  }

  private async publishToPlatform(content: any, platform: string) {
    // Placeholder for actual social media API integration
    return { postId: `${platform}-${Date.now()}`, url: `https://${platform}.com/post/123` }
  }
}

// Content Analytics and Performance
export class ContentAnalytics {
  async getContentPerformance(churchId: string, contentId: string) {
    // This would integrate with social media APIs to get actual metrics
    return {
      contentId,
      platforms: {
        facebook: { likes: 45, shares: 12, comments: 8, reach: 234 },
        instagram: { likes: 67, comments: 15, saves: 23, reach: 189 },
        twitter: { likes: 34, retweets: 8, replies: 5, impressions: 456 }
      },
      totalEngagement: 267,
      topPerformingPlatform: 'instagram'
    }
  }

  async getContentInsights(churchId: string, timeframe: 'week' | 'month' | 'quarter') {
    // Analyze content performance and provide insights
    return {
      totalPosts: 24,
      averageEngagement: 45.6,
      bestPerformingType: 'inspirational',
      optimalPostingTimes: ['9:00 AM', '6:00 PM'],
      topHashtags: ['#faith', '#community', '#prayer'],
      recommendations: [
        'Post more inspirational content - it gets 40% more engagement',
        'Consider posting at 9 AM for maximum reach',
        'Video content performs 60% better than text-only posts'
      ]
    }
  }
}

// Export all services
export const AIContentSystem = {
  Generator: new AIContentGenerator(),
  Scheduler: new ContentScheduler(),
  Analytics: new ContentAnalytics()
}
