import { NextRequest, NextResponse } from 'next/server'
import { AIContentSystem } from '@/lib/ai-content-generation'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, churchId, ...contentRequest } = body

    let result
    switch (type) {
      case 'sermon':
        result = await AIContentSystem.Generator.generateSermonOutline(churchId, contentRequest)
        break
      case 'newsletter':
        result = await AIContentSystem.Generator.generateNewsletterContent(churchId, contentRequest)
        break
      case 'social_post':
        result = await AIContentSystem.Generator.generateSocialMediaPost(churchId, contentRequest)
        break
      case 'prayer':
        result = await AIContentSystem.Generator.generatePrayerContent(churchId, contentRequest)
        break
      case 'devotional':
        result = await AIContentSystem.Generator.generateDevotionalContent(churchId, contentRequest)
        break
      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, content: result })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('churchId')
    const type = searchParams.get('type')

    if (!churchId) {
      return NextResponse.json({ error: 'Church ID required' }, { status: 400 })
    }

    const templates = await AIContentSystem.Generator.getContentTemplates(churchId, type || undefined)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
