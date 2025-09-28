import { supabase } from './supabase'
import axios from 'axios'

export interface SocialMediaConfig {
  platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin'
  accessToken: string
  refreshToken?: string
  accountId: string
  settings: {
    autoPost?: boolean
    defaultHashtags?: string[]
    postingSchedule?: string[]
    contentTypes?: string[]
  }
}

export interface PostMetrics {
  likes: number
  shares: number
  comments: number
  reach: number
  impressions: number
  clicks?: number
  saves?: number
  engagement_rate: number
}

export interface SocialMediaPost {
  id: string
  platform: string
  content: string
  mediaUrls?: string[]
  hashtags?: string[]
  publishedAt?: Date
  scheduledFor?: Date
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  metrics?: PostMetrics
}

// Social Media Integration Service
export class SocialMediaIntegration {
  // Platform Authentication
  async connectPlatform(churchId: string, config: SocialMediaConfig) {
    try {
      // Validate the access token
      await this.validateAccessToken(config.platform, config.accessToken)
      
      // Save the integration
      const { data: integration, error } = await supabase
        .from('social_media_accounts')
        .upsert({
          church_id: churchId,
          platform: config.platform,
          access_token: config.accessToken,
          account_id: config.accountId,
          settings: config.settings,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return integration
    } catch (error) {
      throw new Error(`Failed to connect ${config.platform}: ${error}`)
    }
  }

  async disconnectPlatform(churchId: string, platform: string) {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .update({ is_active: false })
      .eq('church_id', churchId)
      .eq('platform', platform)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  // Content Publishing
  async publishPost(
    churchId: string,
    platform: string,
    content: string,
    mediaUrls?: string[],
    scheduleFor?: Date
  ): Promise<SocialMediaPost> {
    const account = await this.getAccount(churchId, platform)
    if (!account) throw new Error(`No ${platform} account connected`)

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        account_id: account.id,
        platform,
        content,
        media_urls: mediaUrls || null,
        published_at: scheduleFor ? null : new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (scheduleFor) {
      // Schedule the post
      await this.schedulePost(post.id, scheduleFor)
      return { ...post, status: 'scheduled' as const }
    } else {
      // Publish immediately
      const result = await this.publishToPlatform(account, content, mediaUrls)
      
      const { error: updateError } = await supabase
        .from('social_posts')
        .update({
          post_id: result.postId,
          published_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      return { ...post, status: 'published' as const, id: result.postId }
    }
  }

  async publishToMultiplePlatforms(
    churchId: string,
    platforms: string[],
    content: string,
    mediaUrls?: string[],
    scheduleFor?: Date
  ) {
    const results = []
    
    for (const platform of platforms) {
      try {
        const result = await this.publishPost(churchId, platform, content, mediaUrls, scheduleFor)
        results.push({ platform, success: true, post: result })
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

  // Analytics and Metrics
  async getPostMetrics(churchId: string, postId: string): Promise<PostMetrics> {
    const { data: post, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_media_accounts!account_id (*)
      `)
      .eq('id', postId)
      .single()

    if (error || !post || post.social_media_accounts.church_id !== churchId) {
      throw new Error('Post not found')
    }

    // Fetch metrics from the platform API
    const metrics = await this.fetchMetricsFromPlatform(post.social_media_accounts, post.post_id || '')
    
    // Update stored metrics
    const { error: updateError } = await supabase
      .from('social_posts')
      .update({ metrics: metrics as any })
      .eq('id', postId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return metrics
  }

  async getPlatformAnalytics(
    churchId: string, 
    platform: string, 
    timeframe: 'week' | 'month' | 'quarter'
  ) {
    const account = await this.getAccount(churchId, platform)
    if (!account) throw new Error(`No ${platform} account connected`)

    const startDate = this.getStartDate(timeframe)
    
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('account_id', account.id)
      .gte('published_at', startDate.toISOString())
      .order('published_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    // Calculate aggregate metrics
    const totalPosts = posts?.length || 0
    const totalEngagement = posts?.reduce((sum: number, post: any) => {
      const metrics = post.metrics as any
      return sum + (metrics?.likes || 0) + (metrics?.shares || 0) + (metrics?.comments || 0)
    }, 0) || 0

    const averageEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0
    const totalReach = posts?.reduce((sum: number, post: any) => sum + ((post.metrics as any)?.reach || 0), 0) || 0

    return {
      platform,
      timeframe,
      totalPosts,
      totalEngagement,
      averageEngagement,
      totalReach,
      topPosts: posts
        ?.sort((a: any, b: any) => {
          const aEngagement = ((a.metrics as any)?.likes || 0) + ((a.metrics as any)?.shares || 0)
          const bEngagement = ((b.metrics as any)?.likes || 0) + ((b.metrics as any)?.shares || 0)
          return bEngagement - aEngagement
        })
        .slice(0, 5) || [],
      insights: this.generateInsights(posts || [])
    }
  }

  // Content Monitoring and Sentiment Analysis
  async monitorMentions(churchId: string, keywords: string[]) {
    const { data: accounts, error } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)

    if (error) {
      throw new Error(error.message)
    }

    const mentions: any[] = []
    
    for (const account of accounts || []) {
      try {
        const platformMentions = await this.fetchMentionsFromPlatform(account, keywords)
        mentions.push(...platformMentions)
      } catch (error) {
        console.error(`Failed to fetch mentions from ${account.platform}:`, error)
      }
    }

    return mentions
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
    emotions: Record<string, number>
  }> {
    // This would integrate with a sentiment analysis service like AWS Comprehend
    // For now, returning mock data
    return {
      sentiment: 'positive',
      confidence: 0.85,
      emotions: {
        joy: 0.7,
        trust: 0.6,
        anticipation: 0.4,
        sadness: 0.1,
        anger: 0.05
      }
    }
  }

  async getContentSentimentReport(churchId: string, timeframe: 'week' | 'month') {
    const startDate = this.getStartDate(timeframe)
    
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_media_accounts!account_id (church_id)
      `)
      .eq('social_media_accounts.church_id', churchId)
      .gte('published_at', startDate.toISOString())

    if (error) {
      throw new Error(error.message)
    }

    const sentimentAnalysis = []
    
    for (const post of posts || []) {
      const sentiment = await this.analyzeSentiment(post.content)
      sentimentAnalysis.push({
        postId: post.id,
        platform: post.platform,
        content: post.content.substring(0, 100) + '...',
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence,
        publishedAt: post.published_at
      })
    }

    const sentimentCounts = sentimentAnalysis.reduce((counts, analysis) => {
      counts[analysis.sentiment] = (counts[analysis.sentiment] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    return {
      timeframe,
      totalPosts: posts?.length || 0,
      sentimentBreakdown: sentimentCounts,
      averageConfidence: sentimentAnalysis.reduce((sum, a) => sum + a.confidence, 0) / sentimentAnalysis.length,
      posts: sentimentAnalysis
    }
  }

  // Platform-specific implementations
  private async validateAccessToken(platform: string, accessToken: string): Promise<boolean> {
    switch (platform) {
      case 'facebook':
        return await this.validateFacebookToken(accessToken)
      case 'instagram':
        return await this.validateInstagramToken(accessToken)
      case 'twitter':
        return await this.validateTwitterToken(accessToken)
      case 'youtube':
        return await this.validateYouTubeToken(accessToken)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  private async publishToPlatform(
    account: any, 
    content: string, 
    mediaUrls?: string[]
  ): Promise<{ postId: string; url: string }> {
    switch (account.platform) {
      case 'facebook':
        return await this.publishToFacebook(account, content, mediaUrls)
      case 'instagram':
        return await this.publishToInstagram(account, content, mediaUrls)
      case 'twitter':
        return await this.publishToTwitter(account, content, mediaUrls)
      case 'youtube':
        return await this.publishToYouTube(account, content, mediaUrls)
      default:
        throw new Error(`Publishing not implemented for ${account.platform}`)
    }
  }

  // Facebook Integration
  private async validateFacebookToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}`)
      return response.status === 200
    } catch {
      return false
    }
  }

  private async publishToFacebook(
    account: any, 
    content: string, 
    mediaUrls?: string[]
  ): Promise<{ postId: string; url: string }> {
    const url = `https://graph.facebook.com/${account.account_id}/feed`
    
    const postData: any = {
      message: content,
      access_token: account.access_token
    }

    if (mediaUrls && mediaUrls.length > 0) {
      postData.link = mediaUrls[0] // Facebook supports one link per post
    }

    const response = await axios.post(url, postData)
    
    return {
      postId: response.data.id,
      url: `https://facebook.com/${response.data.id}`
    }
  }

  // Instagram Integration
  private async validateInstagramToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://graph.instagram.com/me?access_token=${accessToken}`)
      return response.status === 200
    } catch {
      return false
    }
  }

  private async publishToInstagram(
    account: any, 
    content: string, 
    mediaUrls?: string[]
  ): Promise<{ postId: string; url: string }> {
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one image or video')
    }

    // Step 1: Create media object
    const createMediaUrl = `https://graph.instagram.com/${account.account_id}/media`
    const mediaResponse = await axios.post(createMediaUrl, {
      image_url: mediaUrls[0],
      caption: content,
      access_token: account.access_token
    })

    // Step 2: Publish the media
    const publishUrl = `https://graph.instagram.com/${account.account_id}/media_publish`
    const publishResponse = await axios.post(publishUrl, {
      creation_id: mediaResponse.data.id,
      access_token: account.access_token
    })

    return {
      postId: publishResponse.data.id,
      url: `https://instagram.com/p/${publishResponse.data.id}`
    }
  }

  // Twitter Integration
  private async validateTwitterToken(accessToken: string): Promise<boolean> {
    // Twitter API v2 validation would go here
    return true // Placeholder
  }

  private async publishToTwitter(
    account: any, 
    content: string, 
    mediaUrls?: string[]
  ): Promise<{ postId: string; url: string }> {
    // Twitter API v2 implementation would go here
    return {
      postId: 'twitter-' + Date.now(),
      url: 'https://twitter.com/status/123'
    }
  }

  // YouTube Integration
  private async validateYouTubeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&access_token=${accessToken}`)
      return response.status === 200
    } catch {
      return false
    }
  }

  private async publishToYouTube(
    account: any, 
    content: string, 
    mediaUrls?: string[]
  ): Promise<{ postId: string; url: string }> {
    // YouTube API implementation for community posts would go here
    return {
      postId: 'youtube-' + Date.now(),
      url: 'https://youtube.com/post/123'
    }
  }

  // Helper methods
  private async getAccount(churchId: string, platform: string) {
    const { data, error } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('platform', platform)
      .single()

    if (error) {
      return null
    }

    return data
  }

  private async schedulePost(postId: string, scheduleFor: Date) {
    // This would integrate with a job scheduler
    console.log(`Scheduling post ${postId} for ${scheduleFor}`)
  }

  private async fetchMetricsFromPlatform(account: any, postId: string): Promise<PostMetrics> {
    // Platform-specific metrics fetching would go here
    return {
      likes: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 25),
      reach: Math.floor(Math.random() * 1000),
      impressions: Math.floor(Math.random() * 2000),
      engagement_rate: Math.random() * 10
    }
  }

  private async fetchMentionsFromPlatform(account: any, keywords: string[]) {
    // Platform-specific mention fetching would go here
    return []
  }

  private getStartDate(timeframe: 'week' | 'month' | 'quarter'): Date {
    const now = new Date()
    switch (timeframe) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }
  }

  private generateInsights(posts: any[]): string[] {
    const insights = []
    
    if (posts.length === 0) {
      insights.push('No posts in this timeframe')
      return insights
    }

    // Analyze posting frequency
    const avgPostsPerWeek = posts.length / 4 // Assuming month timeframe
    if (avgPostsPerWeek < 3) {
      insights.push('Consider posting more frequently - aim for 3-5 posts per week')
    }

    // Analyze engagement patterns
    const avgEngagement = posts.reduce((sum: number, post: any) => {
      const metrics = post.metrics as any
      return sum + ((metrics?.likes || 0) + (metrics?.shares || 0) + (metrics?.comments || 0))
    }, 0) / posts.length

    if (avgEngagement < 20) {
      insights.push('Engagement is below average - try more interactive content')
    }

    return insights
  }
}

// Social Media Content Optimizer
export class SocialMediaOptimizer {
  async optimizeContentForPlatform(content: string, platform: string): Promise<string> {
    const optimizations = {
      facebook: {
        maxLength: 2000,
        tips: ['Use engaging questions', 'Include call-to-action', 'Add relevant hashtags']
      },
      instagram: {
        maxLength: 2200,
        tips: ['Use 5-10 hashtags', 'Include emojis', 'Tell a visual story']
      },
      twitter: {
        maxLength: 280,
        tips: ['Be concise', 'Use 1-2 hashtags', 'Include mentions when relevant']
      },
      linkedin: {
        maxLength: 1300,
        tips: ['Professional tone', 'Include industry insights', 'Use professional hashtags']
      }
    }

    const platformConfig = optimizations[platform as keyof typeof optimizations]
    if (!platformConfig) return content

    // Truncate if too long
    if (content.length > platformConfig.maxLength) {
      content = content.substring(0, platformConfig.maxLength - 3) + '...'
    }

    return content
  }

  async suggestHashtags(content: string, platform: string): Promise<string[]> {
    // This would use AI to analyze content and suggest relevant hashtags
    const commonChurchHashtags = [
      '#faith', '#church', '#community', '#prayer', '#worship',
      '#blessed', '#grace', '#hope', '#love', '#jesus'
    ]

    // Simple keyword matching for now
    const suggestions = commonChurchHashtags.filter(tag => 
      content.toLowerCase().includes(tag.substring(1))
    )

    return suggestions.slice(0, platform === 'instagram' ? 10 : 3)
  }

  async getBestPostingTimes(churchId: string, platform: string): Promise<string[]> {
    // Analyze historical engagement data to suggest optimal posting times
    return ['9:00 AM', '12:00 PM', '6:00 PM', '8:00 PM']
  }
}

export const SocialMediaSystem = {
  Integration: new SocialMediaIntegration(),
  Optimizer: new SocialMediaOptimizer()
}
