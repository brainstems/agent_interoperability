import { supabase } from './supabase'
import { aiAgentService } from './ai-agents'

export interface IntroductionRequest {
  id?: string
  church_id: string
  requester_id: string
  member1_id: string
  member2_id: string
  introduction_type: 'MUTUAL_INTEREST' | 'MINISTRY_MATCH' | 'LIFE_STAGE' | 'SKILL_SHARE' | 'PASTORAL_CARE'
  message?: string
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  scheduled_at?: string
  sent_at?: string | null
  response_at?: string | null
  expires_at?: string
  metadata?: any
}

export class IntroductionSystem {
  private static instance: IntroductionSystem
  
  static getInstance(): IntroductionSystem {
    if (!IntroductionSystem.instance) {
      IntroductionSystem.instance = new IntroductionSystem()
    }
    return IntroductionSystem.instance
  }

  // Create an automated introduction between two members
  async createIntroduction(
    churchId: string,
    member1Id: string,
    member2Id: string,
    type: IntroductionRequest['introduction_type'],
    requesterId?: string,
    customMessage?: string
  ): Promise<IntroductionRequest | null> {
    try {
      // Get member profiles
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, interests, bio')
        .in('id', [member1Id, member2Id])
        .eq('church_id', churchId)

      if (membersError || !members || members.length !== 2) {
        console.error('Error fetching members for introduction:', membersError)
        return null
      }

      const [member1, member2] = members
      const message = customMessage || this.generateIntroductionMessage(member1, member2, type)

      // Create introduction request
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 14) // Expires in 2 weeks

      const { data: introduction, error: introError } = await supabase
        .from('introduction_requests')
        .insert({
          church_id: churchId,
          requester_id: requesterId || 'system',
          member1_id: member1Id,
          member2_id: member2Id,
          introduction_type: type,
          message,
          status: 'PENDING',
          scheduled_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: {
            generated_by: 'ai_system',
            common_interests: this.findCommonInterests(member1, member2),
            introduction_reason: this.getIntroductionReason(type)
          }
        })
        .select()
        .single()

      if (introError) {
        console.error('Error creating introduction:', introError)
        return null
      }

      // Schedule the introduction to be sent
      await aiAgentService.queueTask({
        church_id: churchId,
        task_type: 'send_introduction',
        payload: {
          introduction_id: introduction.id,
          member1_id: member1Id,
          member2_id: member2Id
        },
        priority: 6,
        scheduled_at: new Date().toISOString()
      })

      return introduction
    } catch (error) {
      console.error('Error creating introduction:', error)
      return null
    }
  }

  // Generate personalized introduction message
  private generateIntroductionMessage(
    member1: any,
    member2: any,
    type: IntroductionRequest['introduction_type']
  ): string {
    const commonInterests = this.findCommonInterests(member1, member2)
    
    const templates = {
      MUTUAL_INTEREST: `Hi ${member1.first_name} and ${member2.first_name}! I thought you two might enjoy connecting since you both share interests in ${commonInterests.slice(0, 2).join(' and ')}. It would be wonderful to see you both get to know each other better in our church community.`,
      
      MINISTRY_MATCH: `${member1.first_name} and ${member2.first_name}, I'd love to introduce you both! You each have complementary skills and heart for ministry that could create some beautiful opportunities to serve together in our church.`,
      
      LIFE_STAGE: `Hi ${member1.first_name} and ${member2.first_name}! You're both navigating similar life stages and I thought you might find encouragement and friendship in connecting with each other. Our church community is stronger when we support one another.`,
      
      SKILL_SHARE: `${member1.first_name} and ${member2.first_name}, I'm excited to introduce you! You both have valuable skills and experiences that could benefit each other, and I think you'd really enjoy getting to know one another.`,
      
      PASTORAL_CARE: `I wanted to connect ${member1.first_name} and ${member2.first_name} as you both might find encouragement in each other's fellowship and shared faith journey. Sometimes the best support comes from fellow believers walking similar paths.`
    }

    return templates[type] || templates.MUTUAL_INTEREST
  }

  // Find common interests between two members
  private findCommonInterests(member1: any, member2: any): string[] {
    const interests1 = member1.interests || []
    const interests2 = member2.interests || []
    return interests1.filter((interest: string) => interests2.includes(interest))
  }

  // Get human-readable reason for introduction type
  private getIntroductionReason(type: IntroductionRequest['introduction_type']): string {
    const reasons = {
      MUTUAL_INTEREST: 'Shared interests and hobbies',
      MINISTRY_MATCH: 'Complementary ministry skills and calling',
      LIFE_STAGE: 'Similar life circumstances and stages',
      SKILL_SHARE: 'Opportunities for mutual skill sharing',
      PASTORAL_CARE: 'Potential for mutual encouragement and support'
    }
    return reasons[type]
  }

  // Send introduction notifications
  async sendIntroduction(introductionId: string): Promise<boolean> {
    try {
      const { data: introduction, error: introError } = await supabase
        .from('introduction_requests')
        .select(`
          *,
          member1:profiles!member1_id(*),
          member2:profiles!member2_id(*)
        `)
        .eq('id', introductionId)
        .single()

      if (introError || !introduction) {
        console.error('Introduction not found:', introError)
        return false
      }

      // Create notifications for both members
      const notifications = [
        {
          church_id: introduction.church_id,
          user_id: introduction.member1_id,
          channel: 'EMAIL',
          subject: `Introduction: Meet ${introduction.member2.first_name} ${introduction.member2.last_name}`,
          content: this.createNotificationContent(introduction, introduction.member1, introduction.member2),
          payload: {
            introduction_id: introductionId,
            type: 'introduction_request',
            other_member_id: introduction.member2_id
          },
          status: 'PENDING'
        },
        {
          church_id: introduction.church_id,
          user_id: introduction.member2_id,
          channel: 'EMAIL',
          subject: `Introduction: Meet ${introduction.member1.first_name} ${introduction.member1.last_name}`,
          content: this.createNotificationContent(introduction, introduction.member2, introduction.member1),
          payload: {
            introduction_id: introductionId,
            type: 'introduction_request',
            other_member_id: introduction.member1_id
          },
          status: 'PENDING'
        }
      ]

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('Error creating introduction notifications:', notificationError)
        return false
      }

      // Update introduction status
      await supabase
        .from('introduction_requests')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString()
        })
        .eq('id', introductionId)

      return true
    } catch (error) {
      console.error('Error sending introduction:', error)
      return false
    }
  }

  // Create notification content for introduction
  private createNotificationContent(introduction: any, recipient: any, otherMember: any): string {
    return `
Hi ${recipient.first_name},

${introduction.message}

About ${otherMember.first_name}:
${otherMember.bio || `${otherMember.first_name} is an active member of our church community.`}

${introduction.metadata?.common_interests?.length > 0 
  ? `You both share interests in: ${introduction.metadata.common_interests.join(', ')}`
  : ''
}

Feel free to reach out to ${otherMember.first_name} at ${otherMember.email} or connect with them at our next church gathering.

Blessings,
Your Church Community Team

---
This introduction was suggested by our AI fellowship system to help build meaningful connections within our church family.
    `.trim()
  }

  // Respond to an introduction (accept/decline)
  async respondToIntroduction(
    introductionId: string,
    userId: string,
    response: 'ACCEPTED' | 'DECLINED'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('introduction_requests')
        .update({
          status: response,
          response_at: new Date().toISOString()
        })
        .eq('id', introductionId)
        .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)

      if (error) {
        console.error('Error responding to introduction:', error)
        return false
      }

      // If accepted, create a connection record
      if (response === 'ACCEPTED') {
        const { data: introduction } = await supabase
          .from('introduction_requests')
          .select('*')
          .eq('id', introductionId)
          .single()

        if (introduction) {
          await supabase
            .from('connections')
            .insert({
              church_id: introduction.church_id,
              user_id: introduction.member1_id,
              member_id: introduction.member2_id,
              status: 'CONNECTED',
              connected_at: new Date().toISOString(),
              connection_reason: `Introduced through ${introduction.introduction_type.toLowerCase().replace('_', ' ')}`,
              notes: `Connected via automated introduction system`
            })
        }
      }

      return true
    } catch (error) {
      console.error('Error responding to introduction:', error)
      return false
    }
  }

  // Get pending introductions for a user
  async getPendingIntroductions(userId: string, churchId: string): Promise<IntroductionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('introduction_requests')
        .select(`
          *,
          member1:profiles!member1_id(*),
          member2:profiles!member2_id(*)
        `)
        .eq('church_id', churchId)
        .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
        .eq('status', 'SENT')
        .gt('expires_at', new Date().toISOString())
        .order('sent_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending introductions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching pending introductions:', error)
      return []
    }
  }

  // Clean up expired introductions
  async cleanupExpiredIntroductions(): Promise<void> {
    try {
      await supabase
        .from('introduction_requests')
        .update({ status: 'EXPIRED' })
        .eq('status', 'SENT')
        .lt('expires_at', new Date().toISOString())
    } catch (error) {
      console.error('Error cleaning up expired introductions:', error)
    }
  }
}

// Export singleton instance
export const introductionSystem = IntroductionSystem.getInstance()

// React hook for managing introductions
import { useState, useEffect } from 'react'

export function useIntroductions(userId?: string, churchId?: string) {
  const [pendingIntroductions, setPendingIntroductions] = useState<IntroductionRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !churchId) return

    const fetchIntroductions = async () => {
      const introductions = await introductionSystem.getPendingIntroductions(userId, churchId)
      setPendingIntroductions(introductions)
      setLoading(false)
    }

    fetchIntroductions()

    // Set up real-time subscription for introduction updates
    const subscription = supabase
      .channel(`introductions_${userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'introduction_requests',
          filter: `member1_id=eq.${userId}`
        },
        () => fetchIntroductions()
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'introduction_requests',
          filter: `member2_id=eq.${userId}`
        },
        () => fetchIntroductions()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, churchId])

  const respondToIntroduction = async (introductionId: string, response: 'ACCEPTED' | 'DECLINED') => {
    if (!userId) return false
    
    const success = await introductionSystem.respondToIntroduction(introductionId, userId, response)
    if (success) {
      setPendingIntroductions(prev => 
        prev.filter(intro => intro.id !== introductionId)
      )
    }
    return success
  }

  return {
    pendingIntroductions,
    loading,
    respondToIntroduction
  }
}
