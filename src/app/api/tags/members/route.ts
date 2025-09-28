import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { DynamicTaggingManager } from '@/lib/dynamic-tagging'
import { AuditHelpers } from '@/lib/audit-logging'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')
    const profileId = searchParams.get('profileId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (tagId) {
      // Get members with a specific tag
      const result = await DynamicTaggingManager.getMembersWithTag(
        user.churchId || '',
        tagId,
        limit,
        offset
      )

      return NextResponse.json({
        success: true,
        data: result.members,
        pagination: {
          limit,
          offset,
          total: result.total
        }
      })
    } else if (profileId) {
      // Get tags for a specific member
      const tags = await DynamicTaggingManager.getTagsForMember(
        user.churchId || '',
        profileId
      )

      return NextResponse.json({
        success: true,
        data: tags
      })
    } else {
      // Get all member tag assignments with filters
      const isAutomatic = searchParams.get('isAutomatic')
      const assignedBy = searchParams.get('assignedBy')
      const dateRange = searchParams.get('dateRange')

      const filters: any = {}
      if (isAutomatic !== null) filters.isAutomatic = isAutomatic === 'true'
      if (assignedBy) filters.assignedBy = assignedBy
      if (dateRange) {
        try {
          const [start, end] = JSON.parse(dateRange)
          filters.dateRange = [start, end]
        } catch (e) {
          // Invalid date range, ignore
        }
      }

      const memberTags = await DynamicTaggingManager.getMemberTags(
        user.churchId || '',
        filters
      )

      return NextResponse.json({
        success: true,
        data: memberTags
      })
    }
  } catch (error) {
    console.error('Get member tags error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get member tags'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to assign tags
    if (!['ADMIN', 'CLERGY', 'STAFF'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'member_tag',
        'CREATE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { profileId, tagId, reason, profileIds, tagIds } = body

    if (profileIds && tagIds) {
      // Bulk assignment: multiple members, multiple tags
      const results = []
      for (const pId of profileIds) {
        for (const tId of tagIds) {
          try {
            await DynamicTaggingManager.assignTagToMember(
              user.churchId || '',
              pId,
              tId,
              user.id,
              reason,
              false
            )
            results.push({ profileId: pId, tagId: tId, success: true })
          } catch (error) {
            results.push({ 
              profileId: pId, 
              tagId: tId, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      return NextResponse.json({
        success: failureCount === 0,
        data: results,
        message: `Assigned tags: ${successCount} successful${failureCount > 0 ? `, ${failureCount} failed` : ''}`
      })
    } else if (profileId && tagId) {
      // Single assignment
      if (!profileId || !tagId) {
        return NextResponse.json({
          error: 'profileId and tagId are required'
        }, { status: 400 })
      }

      await DynamicTaggingManager.assignTagToMember(
        user.churchId || '',
        profileId,
        tagId,
        user.id,
        reason,
        false
      )

      return NextResponse.json({
        success: true,
        message: 'Tag assigned successfully'
      })
    } else {
      return NextResponse.json({
        error: 'Either (profileId and tagId) or (profileIds and tagIds) are required'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Assign tag error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign tag'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to remove tags
    if (!['ADMIN', 'CLERGY', 'STAFF'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'member_tag',
        'DELETE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const tagId = searchParams.get('tagId')

    if (!profileId || !tagId) {
      return NextResponse.json({
        error: 'profileId and tagId are required'
      }, { status: 400 })
    }

    await DynamicTaggingManager.removeTagFromMember(
      profileId,
      tagId,
      user.id,
      user.churchId || ''
    )

    return NextResponse.json({
      success: true,
      message: 'Tag removed successfully'
    })
  } catch (error) {
    console.error('Remove tag error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove tag'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
