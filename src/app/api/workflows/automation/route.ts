import { NextRequest, NextResponse } from 'next/server'
import { WorkflowDesigner, SmartScheduler, AutomatedDataEntry } from '@/lib/workflow-automation'
import { verifyAuth } from '@/lib/auth'

const workflowDesigner = new WorkflowDesigner()
const smartScheduler = new SmartScheduler()
const dataEntry = new AutomatedDataEntry()

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !user.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    let result
    switch (action) {
      case 'create_workflow':
        result = await workflowDesigner.createWorkflow({
          churchId: user.churchId,
          name: data.name,
          description: data.description,
          trigger: data.trigger,
          createdById: user.id
        })
        break
      case 'get_template':
        result = await workflowDesigner.getWorkflowTemplate(data.templateType)
        break
      case 'optimize_schedule':
        result = await smartScheduler.optimizeSchedule(user.churchId, data.events, data.constraints)
        break
      case 'suggest_meeting_times':
        result = await smartScheduler.suggestMeetingTimes(
          user.churchId,
          data.participants,
          data.duration,
          data.preferences
        )
        break
      case 'process_document':
        result = await dataEntry.processDocument(
          user.churchId,
          data.documentType,
          Buffer.from(data.imageData, 'base64')
        )
        break
      case 'process_contact_form':
        result = await dataEntry.processContactForm(user.churchId, data.formData)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Workflow automation error:', error)
    return NextResponse.json(
      { error: 'Workflow operation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user || !user.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return available workflow templates
    const templates = [
      'new_member',
      'visitor_followup', 
      'donation_thanks',
      'birthday_greeting',
      'absence_care'
    ]

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Workflow GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow data' },
      { status: 500 }
    )
  }
}
