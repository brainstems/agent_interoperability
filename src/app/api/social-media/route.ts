import { NextRequest, NextResponse } from 'next/server'
import { SocialMediaSystem } from '@/lib/social-media-integration'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, churchId, ...data } = body

    let result
    switch (action) {
      case 'connect_platform':
        result = await SocialMediaSystem.Integration.connectPlatform(churchId, data.config)
        break
      case 'publish_post':
        result = await SocialMediaSystem.Integration.publishPost(
          churchId, 
          data.platform, 
          data.content, 
          data.mediaUrls, 
          data.scheduleFor
        )
        break
      case 'publish_multiple':
        result = await SocialMediaSystem.Integration.publishToMultiplePlatforms(
          churchId,
          data.platforms,
          data.content,
          data.mediaUrls,
          data.scheduleFor
        )
        break
      case 'get_analytics':
        result = await SocialMediaSystem.Integration.getPlatformAnalytics(
          churchId,
          data.platform,
          data.timeframe
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Social media API error:', error)
    return NextResponse.json(
      { error: 'Social media operation failed' },
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
    const platform = searchParams.get('platform')

    if (!churchId) {
      return NextResponse.json({ error: 'Church ID required' }, { status: 400 })
    }

    if (platform) {
      const analytics = await SocialMediaSystem.Integration.getPlatformAnalytics(churchId, platform, 'month')
      return NextResponse.json({ analytics })
    }

    return NextResponse.json({ message: 'Social media API ready' })
  } catch (error) {
    console.error('Social media GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social media data' },
      { status: 500 }
    )
  }
}
