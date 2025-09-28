import { NextRequest, NextResponse } from 'next/server'
import { initializeAgentPrompts, createAdditionalPrompts } from '@/lib/init-agent-prompts'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.churchId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { includeAdditional = true } = await request.json()

    // Initialize default prompts
    await initializeAgentPrompts(session.user.churchId)
    
    // Create additional specialized prompts
    if (includeAdditional) {
      await createAdditionalPrompts(session.user.churchId)
    }

    return NextResponse.json({ 
      message: 'Agent prompts initialized successfully',
      churchId: session.user.churchId 
    })
  } catch (error) {
    console.error('Error initializing agent prompts:', error)
    return NextResponse.json(
      { error: 'Failed to initialize agent prompts' },
      { status: 500 }
    )
  }
}
