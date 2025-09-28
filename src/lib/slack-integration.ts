// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { WebClient } from '@slack/web-api'
import { createEventAdapter } from '@slack/events-api'
import axios from 'axios'

export interface SlackConfig {
  botToken: string
  userToken?: string
  signingSecret: string
  teamId: string
  teamName: string
  webhookUrl?: string
}

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  memberCount: number
  purpose?: string
}

export interface SlackMessage {
  channel: string
  text: string
  blocks?: any[]
  attachments?: any[]
  threadTs?: string
  userId?: string
}

// Slack Integration Service
export class SlackIntegration {
  private client: WebClient
  private eventsAdapter: any

  constructor(private config: SlackConfig) {
    this.client = new WebClient(config.botToken)
    this.eventsAdapter = createEventAdapter(config.signingSecret)
    this.setupEventHandlers()
  }

  // Setup and Configuration
  async connectSlackWorkspace(churchId: string, config: SlackConfig) {
    try {
      // Test the connection
      const authTest = await this.client.auth.test()
      
      // Check if integration exists
      const { data: existing } = await supabase
        .from('slack_integrations')
        .select('id')
        .eq('church_id', churchId)
        .single()

      const integrationData = {
        church_id: churchId,
        bot_token: config.botToken,
        user_token: config.userToken,
        signing_secret: config.signingSecret,
        team_id: config.teamId,
        team_name: config.teamName,
        webhook_url: config.webhookUrl,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let integration
      if (existing) {
        const { data, error } = await supabase
          .from('slack_integrations')
          .update(integrationData)
          .eq('church_id', churchId)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to update Slack integration: ${error.message}`)
        }
        integration = data
      } else {
        const { data, error } = await supabase
          .from('slack_integrations')
          .insert({ ...integrationData, created_at: new Date().toISOString() })
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to create Slack integration: ${error.message}`)
        }
        integration = data
      }

      return {
        success: true,
        integration,
        botInfo: authTest
      }
    } catch (error) {
      throw new Error(`Failed to connect Slack workspace: ${error}`)
    }
  }

  async disconnectSlackWorkspace(churchId: string) {
    const { data, error } = await supabase
      .from('slack_integrations')
      .update({
        is_active: false,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('church_id', churchId)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to disconnect Slack workspace: ${error.message}`)
    }
    
    return data
  }

  // Channel Management
  async getChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 1000
      })

      return (result.channels || []).map(channel => ({
        id: channel.id!,
        name: channel.name!,
        isPrivate: channel.is_private || false,
        memberCount: channel.num_members || 0,
        purpose: channel.purpose?.value
      }))
    } catch (error) {
      throw new Error(`Failed to fetch channels: ${error}`)
    }
  }

  async createChannel(name: string, isPrivate: boolean = false, purpose?: string) {
    try {
      const result = await this.client.conversations.create({
        name,
        is_private: isPrivate
      })

      if (purpose && result.channel?.id) {
        await this.client.conversations.setPurpose({
          channel: result.channel.id,
          purpose
        })
      }

      return result.channel
    } catch (error) {
      throw new Error(`Failed to create channel: ${error}`)
    }
  }

  async inviteToChannel(channelId: string, userIds: string[]) {
    try {
      await this.client.conversations.invite({
        channel: channelId,
        users: userIds.join(',')
      })
      return true
    } catch (error) {
      throw new Error(`Failed to invite users to channel: ${error}`)
    }
  }

  // Messaging
  async sendMessage(message: SlackMessage) {
    try {
      const result = await this.client.chat.postMessage({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
        thread_ts: message.threadTs
      })

      return result
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`)
    }
  }

  async sendDirectMessage(userId: string, text: string) {
    try {
      // Open DM channel
      const dmResult = await this.client.conversations.open({
        users: userId
      })

      if (!dmResult.channel?.id) {
        throw new Error('Failed to open DM channel')
      }

      // Send message
      return await this.sendMessage({
        channel: dmResult.channel.id,
        text
      })
    } catch (error) {
      throw new Error(`Failed to send direct message: ${error}`)
    }
  }

  async sendRichMessage(channelId: string, blocks: any[], fallbackText: string) {
    return await this.sendMessage({
      channel: channelId,
      text: fallbackText,
      blocks
    })
  }

  // Church-specific Integrations
  async sendEventNotification(channelId: string, event: {
    title: string
    description?: string
    startDate: Date
    location?: string
    registrationUrl?: string
  }) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📅 Upcoming Event'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${event.title}*\n${event.description || ''}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Date:*\n${event.startDate.toLocaleDateString()}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${event.startDate.toLocaleTimeString()}`
          }
        ]
      }
    ]

    if (event.location) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Location:* ${event.location}`
        }
      })
    }

    if (event.registrationUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Register Now'
            },
            url: event.registrationUrl,
            style: 'primary'
          }
        ]
      })
    }

    return await this.sendRichMessage(channelId, blocks, `Upcoming Event: ${event.title}`)
  }

  async sendPrayerRequest(channelId: string, request: {
    title: string
    description: string
    requestedBy: string
    urgent?: boolean
  }) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: request.urgent ? '🚨 Urgent Prayer Request' : '🙏 Prayer Request'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${request.title}*\n${request.description}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Requested by ${request.requestedBy}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🙏 Praying'
            },
            action_id: 'prayer_response',
            value: 'praying'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💬 Comment'
            },
            action_id: 'prayer_comment',
            value: 'comment'
          }
        ]
      }
    ]

    return await this.sendRichMessage(channelId, blocks, `Prayer Request: ${request.title}`)
  }

  async sendAnnouncementToChannel(channelId: string, announcement: {
    title: string
    content: string
    author: string
    priority?: 'low' | 'medium' | 'high'
    actionUrl?: string
    actionText?: string
  }) {
    const priorityEmoji = {
      low: '📢',
      medium: '📣',
      high: '🚨'
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji[announcement.priority || 'medium']} ${announcement.title}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: announcement.content
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Posted by ${announcement.author}`
          }
        ]
      }
    ]

    if (announcement.actionUrl && announcement.actionText) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: announcement.actionText
            },
            url: announcement.actionUrl,
            style: 'primary'
          }
        ]
      })
    }

    return await this.sendRichMessage(channelId, blocks, `Announcement: ${announcement.title}`)
  }

  // Member Management Integration
  async notifyNewMember(channelId: string, member: {
    name: string
    email?: string
    joinDate: Date
    welcomeMessage?: string
  }) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '👋 New Member Welcome!'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Please join me in welcoming *${member.name}* to our church family!`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Name:* ${member.name}`
          },
          {
            type: 'mrkdwn',
            text: `*Joined:* ${member.joinDate.toLocaleDateString()}`
          }
        ]
      }
    ]

    if (member.welcomeMessage) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Welcome Message:*\n${member.welcomeMessage}`
        }
      })
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '👋 Say Hello'
          },
          action_id: 'welcome_member',
          value: member.name
        }
      ]
    })

    return await this.sendRichMessage(channelId, blocks, `New Member: ${member.name}`)
  }

  // Volunteer Coordination
  async requestVolunteers(channelId: string, opportunity: {
    title: string
    description: string
    date: Date
    duration?: string
    skillsNeeded?: string[]
    contactPerson: string
    signupUrl?: string
  }) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🙋‍♀️ Volunteer Opportunity'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${opportunity.title}*\n${opportunity.description}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Date:* ${opportunity.date.toLocaleDateString()}`
          },
          {
            type: 'mrkdwn',
            text: `*Duration:* ${opportunity.duration || 'TBD'}`
          }
        ]
      }
    ]

    if (opportunity.skillsNeeded && opportunity.skillsNeeded.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Skills Needed:* ${opportunity.skillsNeeded.join(', ')}`
        }
      })
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Contact: ${opportunity.contactPerson}`
        }
      ]
    })

    const actionElements = [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '✋ I can help!'
        },
        action_id: 'volunteer_signup',
        value: opportunity.title,
        style: 'primary'
      }
    ]

    if (opportunity.signupUrl) {
      actionElements.push({
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'More Info'
        },
        url: opportunity.signupUrl
      })
    }

    blocks.push({
      type: 'actions',
      elements: actionElements
    })

    return await this.sendRichMessage(channelId, blocks, `Volunteer Opportunity: ${opportunity.title}`)
  }

  // Event Handlers
  private setupEventHandlers() {
    // Handle button clicks and interactions
    this.eventsAdapter.on('interactive_message', async (payload: any) => {
      await this.handleInteractiveMessage(payload)
    })

    // Handle app mentions
    this.eventsAdapter.on('app_mention', async (event: any) => {
      await this.handleAppMention(event)
    })

    // Handle direct messages
    this.eventsAdapter.on('message', async (event: any) => {
      if (event.channel_type === 'im') {
        await this.handleDirectMessage(event)
      }
    })
  }

  private async handleInteractiveMessage(payload: any) {
    const action = payload.actions[0]
    
    switch (action.action_id) {
      case 'prayer_response':
        await this.handlePrayerResponse(payload, action.value)
        break
      case 'volunteer_signup':
        await this.handleVolunteerSignup(payload, action.value)
        break
      case 'welcome_member':
        await this.handleWelcomeMember(payload, action.value)
        break
    }
  }

  private async handlePrayerResponse(payload: any, response: string) {
    const user = payload.user
    const channel = payload.channel.id
    
    await this.sendMessage({
      channel,
      text: `${user.name} is praying for this request 🙏`,
      threadTs: payload.message.ts
    })
  }

  private async handleVolunteerSignup(payload: any, opportunity: string) {
    const user = payload.user
    const channel = payload.channel.id
    
    await this.sendMessage({
      channel,
      text: `🎉 ${user.name} has volunteered for: ${opportunity}`,
      threadTs: payload.message.ts
    })

    // Send DM to volunteer with next steps
    await this.sendDirectMessage(
      user.id,
      `Thank you for volunteering for "${opportunity}"! Someone will contact you soon with more details.`
    )
  }

  private async handleWelcomeMember(payload: any, memberName: string) {
    const user = payload.user
    const channel = payload.channel.id
    
    await this.sendMessage({
      channel,
      text: `${user.name} says hello to ${memberName}! 👋`,
      threadTs: payload.message.ts
    })
  }

  private async handleAppMention(event: any) {
    const text = event.text.toLowerCase()
    
    if (text.includes('help')) {
      await this.sendHelpMessage(event.channel)
    } else if (text.includes('prayer')) {
      await this.sendMessage({
        channel: event.channel,
        text: 'I can help you share prayer requests! Use the church management system to submit prayer requests, and I\'ll share them here.'
      })
    } else {
      await this.sendMessage({
        channel: event.channel,
        text: 'Hi! I\'m the church management bot. I can help with announcements, prayer requests, and volunteer coordination. Type "help" for more information.'
      })
    }
  }

  private async handleDirectMessage(event: any) {
    await this.sendMessage({
      channel: event.channel,
      text: 'Hello! I\'m the church management bot. For assistance, please contact your church administrator or use the church management system.'
    })
  }

  private async sendHelpMessage(channelId: string) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🤖 Church Management Bot Help'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'I can help you with:'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '• 📅 Event notifications and reminders\n• 🙏 Prayer request sharing\n• 📢 Church announcements\n• 👋 New member welcomes\n• 🙋‍♀️ Volunteer opportunity coordination'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'All content is managed through your church management system and automatically shared here when appropriate.'
        }
      }
    ]

    return await this.sendRichMessage(channelId, blocks, 'Church Management Bot Help')
  }

  // Analytics and Reporting
  async getChannelActivity(channelId: string, days: number = 7) {
    try {
      const oldest = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
      
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: oldest.toString(),
        limit: 1000
      })

      const messages = result.messages || []
      
      return {
        totalMessages: messages.length,
        uniqueUsers: new Set(messages.map(m => m.user)).size,
        averageMessagesPerDay: messages.length / days,
        mostActiveUser: this.getMostActiveUser(messages),
        messageTypes: this.analyzeMessageTypes(messages)
      }
    } catch (error) {
      throw new Error(`Failed to get channel activity: ${error}`)
    }
  }

  private getMostActiveUser(messages: any[]) {
    const userCounts = messages.reduce((counts, message) => {
      if (message.user) {
      } else if (message.attachments && message.attachments.length > 0) {
        types.attachments = (types.attachments || 0) + 1
      } else if (message.thread_ts) {
        types.replies = (types.replies || 0) + 1
      } else {
        types.regular = (types.regular || 0) + 1
      }
      return types
    }, {} as Record<string, number>)
  }
}

// Slack Bot Commands
export class SlackBotCommands {
  constructor(private integration: SlackIntegration) {}

  async handleSlashCommand(command: string, text: string, userId: string, channelId: string) {
    switch (command) {
      case '/prayer':
        return await this.handlePrayerCommand(text, userId, channelId)
      case '/volunteer':
        return await this.handleVolunteerCommand(text, userId, channelId)
      case '/events':
        return await this.handleEventsCommand(text, userId, channelId)
      default:
        return { text: 'Unknown command. Type /help for available commands.' }
    }
  }

  private async handlePrayerCommand(text: string, userId: string, channelId: string) {
    if (!text.trim()) {
      return {
        text: 'Please provide a prayer request. Usage: /prayer [your prayer request]'
      }
    }

    await this.integration.sendPrayerRequest(channelId, {
      title: 'Prayer Request',
      description: text,
      requestedBy: `<@${userId}>`
    })

    return { text: 'Your prayer request has been shared.' }
  }

  private async handleVolunteerCommand(text: string, userId: string, channelId: string) {
    return {
      text: 'Volunteer opportunities are managed through the church management system. Check there for current opportunities!'
    }
  }

  private async handleEventsCommand(text: string, userId: string, channelId: string) {
    return {
      text: 'Upcoming events are automatically shared here. Check the church management system for the full calendar!'
    }
  }
}

