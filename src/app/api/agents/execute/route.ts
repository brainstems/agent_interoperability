import { NextRequest, NextResponse } from 'next/server'
import { getPromptManager } from '@/lib/prompt-manager'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      agentType,
      promptType,
      promptName,
      variables = {},
      sessionId
    } = body

    if (!agentType || !promptType || !promptName) {
      return NextResponse.json(
        { error: 'Missing required fields: agentType, promptType, promptName' },
        { status: 400 }
      )
    }

    const promptManager = getPromptManager()
    
    // Execute the prompt with provided variables
    const result = await promptManager.executePrompt(
      session.user.churchId,
      agentType,
      promptType,
      promptName,
      variables,
      sessionId
    )

    return NextResponse.json({
      success: result.success,
      response: result.response,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      duration: result.duration,
      errorMessage: result.errorMessage
    })
  } catch (error) {
    console.error('Error executing agent prompt:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute agent prompt',
        errorMessage: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('promptId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!promptId) {
      return NextResponse.json(
        { error: 'Missing promptId parameter' },
        { status: 400 }
      )
    }

    const promptManager = getPromptManager()
    const executionHistory = await promptManager.getExecutionHistory(
      promptId,
      limit,
      offset
    )

    return NextResponse.json(executionHistory)
  } catch (error) {
    console.error('Error fetching execution history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution history' },
      { status: 500 }
    )
  }
}
