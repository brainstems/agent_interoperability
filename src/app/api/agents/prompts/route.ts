import { NextRequest, NextResponse } from 'next/server'
import { getPromptManager } from '@/lib/prompt-manager'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')
    const promptType = searchParams.get('promptType')
    const name = searchParams.get('name')

    const promptManager = getPromptManager()

    if (agentType && promptType && name) {
      // Get specific prompt
      const prompt = await promptManager.getPrompt(
        session.user.churchId,
        agentType,
        promptType,
        name
      )
      
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
      }
      
      return NextResponse.json(prompt)
    } else if (agentType) {
      // Get all prompts for an agent
      const prompts = await promptManager.getAgentPrompts(
        session.user.churchId,
        agentType
      )
      
      return NextResponse.json(prompts)
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      temperature = 0.7,
      maxTokens = 1000,
      model = 'gpt-4',
      isActive = true
    } = body

    if (!agentType || !promptType || !name || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const promptManager = getPromptManager()
    const prompt = await promptManager.createOrUpdatePrompt({
      churchId: session.user.churchId,
      agentType,
      promptType,
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      temperature,
      maxTokens,
      model,
      isActive,
      version: 1
    })

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      agentType,
      promptType,
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      temperature,
      maxTokens,
      model,
      isActive
    } = body

    if (!agentType || !promptType || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const promptManager = getPromptManager()
    const prompt = await promptManager.createOrUpdatePrompt({
      churchId: session.user.churchId,
      agentType,
      promptType,
      name,
      description,
      systemPrompt,
      userPrompt,
      variables,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1000,
      model: model || 'gpt-4',
      isActive: isActive !== undefined ? isActive : true,
      version: 1
    })

    return NextResponse.json(prompt)
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
