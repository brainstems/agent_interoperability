import { getPromptManager } from './prompt-manager'

export async function initializeAgentPrompts(churchId: string): Promise<void> {
  const promptManager = getPromptManager()
  
  try {
    await promptManager.initializeDefaultPrompts(churchId)
    console.log(`✅ Default agent prompts initialized for church: ${churchId}`)
  } catch (error) {
    console.error('❌ Failed to initialize agent prompts:', error)
    throw error
  }
}

// Additional prompt templates for missing agent types
export async function createAdditionalPrompts(churchId: string): Promise<void> {
  const promptManager = getPromptManager()
  
  const additionalPrompts = [
    // Task Analysis prompts for MeetingOrganizer
    {
      churchId,
      agentType: 'MeetingOrganizer',
      promptType: 'TASK_ANALYSIS' as const,
      name: 'analyze_meeting_request',
      description: 'Analyze incoming meeting requests and suggest scheduling approach',
      systemPrompt: `Analyze this meeting request and provide structured recommendations for scheduling.

Meeting Request Details:
{{meeting_details}}

Church: {{church_name}}
Requested by: {{requested_by}}
Urgency: {{urgency}}

Provide analysis in this format:
1. **Meeting Type Assessment**: Classify the meeting type and importance
2. **Scheduling Priority**: High/Medium/Low based on urgency and participants
3. **Recommended Duration**: Suggest appropriate meeting length
4. **Optimal Timing**: Best time slots considering church schedule
5. **Required Attendees**: Who should be invited based on the request
6. **Preparation Needed**: Any advance preparation or materials required
7. **Follow-up Actions**: Next steps after the meeting

Consider church calendar, staff availability, and ministry priorities in your recommendations.`,
      temperature: 0.4,
      maxTokens: 800,
      model: 'gpt-4',
      isActive: true,
      version: 1,
      variables: [
        { name: 'meeting_details', description: 'JSON string of meeting request details', type: 'string' as const, required: true },
        { name: 'church_name', description: 'Name of the church', type: 'string' as const, required: true },
        { name: 'requested_by', description: 'Person requesting the meeting', type: 'string' as const, required: true },
        { name: 'urgency', description: 'Urgency level of the request', type: 'string' as const, required: false, default: 'normal' }
      ]
    },

    // Data Extraction prompts for EmailProcessor
    {
      churchId,
      agentType: 'EmailProcessor',
      promptType: 'DATA_EXTRACTION' as const,
      name: 'extract_prayer_request',
      description: 'Extract structured prayer request data from emails',
      systemPrompt: `Extract prayer request information from this email content.

Email Content:
{{email_content}}

Extract and structure the following information:
- **Request Type**: Personal, family, health, financial, spiritual, other
- **Urgency**: Urgent, normal, ongoing
- **Privacy Level**: Public (can be shared), confidential (pastoral only), anonymous
- **Specific Request**: The actual prayer need in their own words
- **Follow-up Needed**: Whether pastoral contact is requested
- **Contact Preference**: How they prefer to be contacted (if any)

Return the information in JSON format with clear, compassionate language that respects the sensitivity of prayer requests.`,
      temperature: 0.2,
      maxTokens: 600,
      model: 'gpt-4',
      isActive: true,
      version: 1,
      variables: [
        { name: 'email_content', description: 'Full email content to analyze', type: 'string' as const, required: true }
      ]
    },

    // Follow-up sequence prompts
    {
      churchId,
      agentType: 'FollowUpAgent',
      promptType: 'FOLLOW_UP_SEQUENCE' as const,
      name: 'new_member_welcome',
      description: 'Generate personalized welcome sequence for new members',
      systemPrompt: `Create a personalized welcome message sequence for a new church member.

Member Information:
- Name: {{member_name}}
- Join Date: {{join_date}}
- Background: {{member_background}}
- Interests: {{interests}}
- Family Status: {{family_status}}

Church Information:
- Church Name: {{church_name}}
- Pastor Name: {{pastor_name}}
- Key Ministries: {{key_ministries}}

Create a warm, welcoming message that:
1. Personally welcomes them to the church family
2. Acknowledges their background and interests
3. Suggests relevant ministries or groups they might enjoy
4. Provides next steps for getting connected
5. Offers pastoral contact if desired
6. Maintains a genuine, caring tone

Keep the message personal but not overwhelming, and focus on building community connection.`,
      temperature: 0.6,
      maxTokens: 700,
      model: 'gpt-4',
      isActive: true,
      version: 1,
      variables: [
        { name: 'member_name', description: 'New member full name', type: 'string' as const, required: true },
        { name: 'join_date', description: 'Date they joined the church', type: 'string' as const, required: true },
        { name: 'member_background', description: 'Brief background information', type: 'string' as const, required: false },
        { name: 'interests', description: 'Known interests or ministry preferences', type: 'string' as const, required: false },
        { name: 'family_status', description: 'Family information', type: 'string' as const, required: false },
        { name: 'church_name', description: 'Name of the church', type: 'string' as const, required: true },
        { name: 'pastor_name', description: 'Lead pastor name', type: 'string' as const, required: false },
        { name: 'key_ministries', description: 'List of key church ministries', type: 'string' as const, required: false }
      ]
    },

    // Pastoral Care prompts
    {
      churchId,
      agentType: 'FollowUpAgent',
      promptType: 'PASTORAL_CARE' as const,
      name: 'care_outreach_message',
      description: 'Generate caring outreach messages for members needing attention',
      systemPrompt: `Generate a caring outreach message for a church member who may need pastoral attention.

Member Situation:
- Name: {{member_name}}
- Last Contact: {{last_contact}}
- Situation: {{situation_summary}}
- Relationship to Church: {{relationship_status}}
- Preferred Contact Method: {{contact_preference}}

Message Guidelines:
1. Express genuine care and concern
2. Acknowledge their absence without being judgmental
3. Offer specific support or assistance
4. Invite reconnection without pressure
5. Provide clear next steps or contact information
6. Maintain appropriate pastoral boundaries
7. Show that they are missed and valued

Tone should be warm, non-intrusive, and genuinely caring. Avoid making assumptions about their situation.`,
      temperature: 0.5,
      maxTokens: 500,
      model: 'gpt-4',
      isActive: true,
      version: 1,
      variables: [
        { name: 'member_name', description: 'Member full name', type: 'string' as const, required: true },
        { name: 'last_contact', description: 'Date of last contact or attendance', type: 'string' as const, required: false },
        { name: 'situation_summary', description: 'Brief summary of their situation', type: 'string' as const, required: false },
        { name: 'relationship_status', description: 'Their relationship/involvement with church', type: 'string' as const, required: false },
        { name: 'contact_preference', description: 'How they prefer to be contacted', type: 'string' as const, required: false, default: 'email' }
      ]
    }
  ]

  for (const prompt of additionalPrompts) {
    try {
      await promptManager.createOrUpdatePrompt(prompt)
      console.log(`✅ Created prompt: ${prompt.agentType}/${prompt.promptType}/${prompt.name}`)
    } catch (error) {
      console.error(`❌ Failed to create prompt ${prompt.name}:`, error)
    }
  }
}
