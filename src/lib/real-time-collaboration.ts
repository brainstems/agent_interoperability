import { supabase } from '@/lib/supabase'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

export interface WorkspaceActivity {
  id: string
  workspaceId: string
  userId: string
  activityType: 'member_added' | 'document_edited' | 'comment_added' | 'task_completed' | 'file_uploaded' | 'meeting_scheduled'
  description: string
  metadata?: any
  timestamp: Date
}

export interface TeamMessage {
  id: string
  workspaceId: string
  senderId: string
  content: string
  messageType: 'text' | 'file' | 'mention' | 'system'
  mentions?: string[]
  attachments?: string[]
  timestamp: Date
}

export interface CollaborationSession {
  id: string
  workspaceId: string
  participants: string[]
  documentId?: string
  sessionType: 'document_editing' | 'planning_meeting' | 'prayer_session' | 'general'
  startedAt: Date
  endedAt?: Date
}

// Real-time Collaboration Service
export class RealTimeCollaboration {
  private io: SocketIOServer
  private activeSessions: Map<string, CollaborationSession> = new Map()
  private userConnections: Map<string, string[]> = new Map() // userId -> socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    this.setupSocketHandlers()
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      socket.on('join_workspace', async (data: { workspaceId: string; userId: string }) => {
        await this.handleJoinWorkspace(socket, data)
      })

      socket.on('leave_workspace', async (data: { workspaceId: string; userId: string }) => {
        await this.handleLeaveWorkspace(socket, data)
      })

      socket.on('send_message', async (data: TeamMessage) => {
        await this.handleSendMessage(socket, data)
      })

      socket.on('start_collaboration_session', async (data: Omit<CollaborationSession, 'id' | 'startedAt'>) => {
        await this.handleStartCollaborationSession(socket, data)
      })

      socket.on('join_collaboration_session', async (data: { sessionId: string; userId: string }) => {
        await this.handleJoinCollaborationSession(socket, data)
      })

      socket.on('document_edit', async (data: { documentId: string; changes: any; userId: string }) => {
        await this.handleDocumentEdit(socket, data)
      })

      socket.on('typing_indicator', (data: { workspaceId: string; userId: string; isTyping: boolean }) => {
        this.handleTypingIndicator(socket, data)
      })

      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  // Workspace Management
  async createWorkspace(data: {
    churchId: string
    name: string
    description?: string
    type: 'ministry' | 'project' | 'committee' | 'general'
    createdById: string
  }) {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        church_id: data.churchId,
        name: data.name,
        description: data.description,
        type: data.type,
        created_by_id: data.createdById,
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`)
    }

    // Add creator as admin
    await this.addWorkspaceMember(workspace.id, data.createdById, 'admin')

    return workspace
  }

  async addWorkspaceMember(
    workspaceId: string, 
    userId: string, 
    role: 'admin' | 'member' | 'viewer' = 'member'
  ) {
    const { data: member, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to add workspace member: ${error.message}`)
    }

    // Notify workspace members
    await this.broadcastToWorkspace(workspaceId, 'member_added', {
      member,
      message: `New member joined the workspace`
    })

    // Log activity
    await this.logActivity({
      workspaceId,
      userId,
      activityType: 'member_added',
      description: `${userId} joined the workspace`,
      metadata: { role }
    })

    return member
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
    
    if (error) {
      throw new Error(`Failed to remove workspace member: ${error.message}`)
    }

    // Notify workspace
    await this.broadcastToWorkspace(workspaceId, 'member_removed', {
      userId,
      message: `Member left the workspace`
    })
  }

  // Real-time Messaging
  async sendMessage(data: Omit<TeamMessage, 'id' | 'timestamp'>) {
    const { data: message, error } = await supabase
      .from('workspace_activities')
      .insert({
        workspace_id: data.workspaceId,
        user_id: data.senderId,
        activity_type: 'message_sent',
        description: data.content,
        metadata: {
          messageType: data.messageType,
          mentions: data.mentions,
          attachments: data.attachments
        }
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to send message: ${error.message}`)
    }

    // Broadcast to workspace members
    await this.broadcastToWorkspace(data.workspaceId, 'new_message', {
      ...data,
      id: message.id,
      timestamp: message.created_at
    })

    // Send notifications to mentioned users
    if (data.mentions && data.mentions.length > 0) {
      await this.notifyMentionedUsers(data.mentions, data.workspaceId, data.content)
    }

    return message
  }

  // Activity Feed
  async getWorkspaceActivity(
    workspaceId: string, 
    limit: number = 50, 
    offset: number = 0
  ) {
    const { data: activities, error } = await supabase
      .from('workspace_activities')
      .select(`
        *,
        profiles!inner(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      throw new Error(`Failed to get workspace activity: ${error.message}`)
    }

    return activities || []
  }

  async logActivity(data: Omit<WorkspaceActivity, 'id' | 'timestamp'>) {
    const { data: activity, error } = await supabase
      .from('workspace_activities')
      .insert({
        workspace_id: data.workspaceId,
        user_id: data.userId,
        activity_type: data.activityType,
        description: data.description,
        metadata: data.metadata
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`)
    }

    // Broadcast activity to workspace members
    await this.broadcastToWorkspace(data.workspaceId, 'activity_update', activity)

    return activity
  }

  // Document Collaboration
  async startDocumentCollaboration(
    workspaceId: string,
    documentId: string,
    userId: string,
    documentType: 'sermon' | 'newsletter' | 'meeting_notes' | 'planning_doc'
  ) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const session: CollaborationSession = {
      id: sessionId,
      workspaceId,
      participants: [userId],
      documentId,
      sessionType: 'document_editing',
      startedAt: new Date()
    }

    this.activeSessions.set(sessionId, session)

    // Notify workspace about collaboration session
    await this.broadcastToWorkspace(workspaceId, 'collaboration_started', {
      sessionId,
      documentId,
      documentType,
      startedBy: userId
    })

    return session
  }

  async joinDocumentCollaboration(sessionId: string, userId: string) {
    const session = this.activeSessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    if (!session.participants.includes(userId)) {
      session.participants.push(userId)
      this.activeSessions.set(sessionId, session)
    }

    // Notify other participants
    await this.broadcastToWorkspace(session.workspaceId, 'user_joined_collaboration', {
      sessionId,
      userId,
      participants: session.participants
    })

    return session
  }

  async syncDocumentChanges(
    sessionId: string,
    userId: string,
    changes: {
      operation: 'insert' | 'delete' | 'format'
      position: number
      content?: string
      length?: number
      formatting?: any
    }
  ) {
    const session = this.activeSessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    // Broadcast changes to other participants
    await this.broadcastToWorkspace(session.workspaceId, 'document_changes', {
      sessionId,
      userId,
      changes,
      timestamp: new Date()
    })

    // Log the edit activity
    await this.logActivity({
      workspaceId: session.workspaceId,
      userId,
      activityType: 'document_edited',
      description: `Made changes to document`,
      metadata: { sessionId, documentId: session.documentId, changes }
    })
  }

  // Team Coordination
  async scheduleTeamMeeting(data: {
    workspaceId: string
    title: string
    description?: string
    scheduledFor: Date
    duration: number
    participants: string[]
    meetingType: 'planning' | 'prayer' | 'ministry' | 'staff'
    organizedBy: string
  }) {
    const { data: meeting, error } = await supabase
      .from('workspace_activities')
      .insert({
        workspace_id: data.workspaceId,
        user_id: data.organizedBy,
        activity_type: 'meeting_scheduled',
        description: `Meeting scheduled: ${data.title}`,
        metadata: {
          title: data.title,
          description: data.description,
          scheduledFor: data.scheduledFor.toISOString(),
          duration: data.duration,
          participants: data.participants,
          meetingType: data.meetingType
        }
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to schedule meeting: ${error.message}`)
    }

    // Notify participants
    for (const participantId of data.participants) {
      await this.sendNotification(participantId, {
        type: 'meeting_invitation',
        title: `Meeting Invitation: ${data.title}`,
        message: `You've been invited to a ${data.meetingType} meeting`,
        workspaceId: data.workspaceId,
        metadata: { meetingId: meeting.id }
      })
    }

    // Broadcast to workspace
    await this.broadcastToWorkspace(data.workspaceId, 'meeting_scheduled', meeting)

    return meeting
  }

  async createTeamTask(data: {
    workspaceId: string
    title: string
    description?: string
    assignedTo?: string
    dueDate?: Date
    priority: 'low' | 'medium' | 'high'
    taskType: 'follow_up' | 'preparation' | 'outreach' | 'administrative'
    createdBy: string
  }) {
    const { data: task, error } = await supabase
      .from('workspace_activities')
      .insert({
        workspace_id: data.workspaceId,
        user_id: data.createdBy,
        activity_type: 'task_created',
        description: `Task created: ${data.title}`,
        metadata: {
          title: data.title,
          description: data.description,
          assignedTo: data.assignedTo,
          dueDate: data.dueDate?.toISOString(),
          priority: data.priority,
          taskType: data.taskType,
          status: 'pending'
        }
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create team task: ${error.message}`)
    }

    // Notify assigned user
    if (data.assignedTo) {
      await this.sendNotification(data.assignedTo, {
        type: 'task_assigned',
        title: `New Task: ${data.title}`,
        message: `You've been assigned a new ${data.taskType} task`,
        workspaceId: data.workspaceId,
        metadata: { taskId: task.id }
      })
    }

    // Broadcast to workspace
    await this.broadcastToWorkspace(data.workspaceId, 'task_created', task)

    return task
  }

  // Socket Event Handlers
  private async handleJoinWorkspace(socket: any, data: { workspaceId: string; userId: string }) {
    socket.join(`workspace:${data.workspaceId}`)
    
    // Track user connection
    const userSockets = this.userConnections.get(data.userId) || []
    userSockets.push(socket.id)
    this.userConnections.set(data.userId, userSockets)

    // Notify others that user is online
    socket.to(`workspace:${data.workspaceId}`).emit('user_online', {
      userId: data.userId,
      timestamp: new Date()
    })
  }

  private async handleLeaveWorkspace(socket: any, data: { workspaceId: string; userId: string }) {
    socket.leave(`workspace:${data.workspaceId}`)
    
    // Update user connections
    const userSockets = this.userConnections.get(data.userId) || []
    const updatedSockets = userSockets.filter(id => id !== socket.id)
    
    if (updatedSockets.length === 0) {
      this.userConnections.delete(data.userId)
      // Notify others that user is offline
      socket.to(`workspace:${data.workspaceId}`).emit('user_offline', {
        userId: data.userId,
        timestamp: new Date()
      })
    } else {
      this.userConnections.set(data.userId, updatedSockets)
    }
  }

  private async handleSendMessage(socket: any, data: TeamMessage) {
    const message = await this.sendMessage(data)
    // Message is already broadcasted in sendMessage method
  }

  private async handleStartCollaborationSession(socket: any, data: Omit<CollaborationSession, 'id' | 'startedAt'>) {
    const session = await this.startDocumentCollaboration(
      data.workspaceId,
      data.documentId || '',
      data.participants[0],
      'planning_doc'
    )
    
    socket.emit('collaboration_session_started', session)
  }

  private async handleJoinCollaborationSession(socket: any, data: { sessionId: string; userId: string }) {
    const session = await this.joinDocumentCollaboration(data.sessionId, data.userId)
    socket.join(`session:${data.sessionId}`)
    socket.emit('collaboration_session_joined', session)
  }

  private async handleDocumentEdit(socket: any, data: { documentId: string; changes: any; userId: string }) {
    // Find active session for this document
    const session = Array.from(this.activeSessions.values()).find(s => s.documentId === data.documentId)
    if (session) {
      await this.syncDocumentChanges(session.id, data.userId, data.changes)
    }
  }

  private handleTypingIndicator(socket: any, data: { workspaceId: string; userId: string; isTyping: boolean }) {
    socket.to(`workspace:${data.workspaceId}`).emit('typing_indicator', data)
  }

  private handleDisconnect(socket: any) {
    // Clean up user connections
    for (const [userId, socketIds] of Array.from(this.userConnections.entries())) {
      const updatedSockets = socketIds.filter((id: string) => id !== socket.id)
      if (updatedSockets.length === 0) {
        this.userConnections.delete(userId)
      } else {
        this.userConnections.set(userId, updatedSockets)
      }
    }
  }

  // Utility Methods
  private async broadcastToWorkspace(workspaceId: string, event: string, data: any) {
    this.io.to(`workspace:${workspaceId}`).emit(event, data)
  }

  private async sendNotification(userId: string, notification: {
    type: string
    title: string
    message: string
    workspaceId: string
    metadata?: any
  }) {
    const userSockets = this.userConnections.get(userId) || []
    for (const socketId of userSockets) {
      this.io.to(socketId).emit('notification', notification)
    }
  }

  private async notifyMentionedUsers(mentionedUserIds: string[], workspaceId: string, message: string) {
    for (const userId of mentionedUserIds) {
      await this.sendNotification(userId, {
        type: 'mention',
        title: 'You were mentioned',
        message: message.substring(0, 100) + '...',
        workspaceId,
        metadata: { fullMessage: message }
      })
    }
  }

  // Public API Methods
  async getWorkspaceMembers(workspaceId: string) {
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        profiles!inner(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
    
    if (error) {
      throw new Error(`Failed to get workspace members: ${error.message}`)
    }

    return members || []
  }

  async getActiveCollaborationSessions(workspaceId: string) {
    return Array.from(this.activeSessions.values()).filter(
      session => session.workspaceId === workspaceId && !session.endedAt
    )
  }

  async endCollaborationSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.endedAt = new Date()
      this.activeSessions.set(sessionId, session)
      
      await this.broadcastToWorkspace(session.workspaceId, 'collaboration_ended', {
        sessionId,
        endedAt: session.endedAt
      })
    }
  }
}

// Notification Service
export class NotificationService {
  async sendPushNotification(userId: string, notification: {
    title: string
    body: string
    data?: any
  }) {
    // This would integrate with a push notification service like Firebase
    console.log(`Sending push notification to ${userId}:`, notification)
  }

  async sendEmailNotification(userId: string, notification: {
    subject: string
    body: string
    template?: string
  }) {
    // This would integrate with an email service
    console.log(`Sending email notification to ${userId}:`, notification)
  }

  async getNotificationPreferences(userId: string) {
    // Get user's notification preferences
    return {
      email: true,
      push: true,
      mentions: true,
      tasks: true,
      meetings: true
    }
  }
}

