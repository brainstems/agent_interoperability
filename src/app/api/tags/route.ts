import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { DynamicTaggingManager, Tag, TagSearchFilters } from '@/lib/dynamic-tagging'
import { AuditHelpers } from '@/lib/audit-logging'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tagType = searchParams.get('tagType') as any
    const isActive = searchParams.get('isActive')
    const isPublic = searchParams.get('isPublic')
    const createdBy = searchParams.get('createdBy')

    const filters: TagSearchFilters = {}
    if (category) filters.category = category
    if (tagType) filters.tagType = tagType
    if (isActive !== null) filters.isActive = isActive === 'true'
    if (isPublic !== null) filters.isPublic = isPublic === 'true'
    if (createdBy) filters.createdBy = createdBy

    const tags = await DynamicTaggingManager.getTags(user.churchId || '', filters)

    return NextResponse.json({
      success: true,
      data: tags
    })
  } catch (error) {
    console.error('Get tags error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tags'
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
      await AuditHelpers.logPermissionDenied('', '', 'tag', 'CREATE', request)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create tags
    if (!['ADMIN', 'CLERGY', 'STAFF'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'tag',
        'CREATE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: Tag = await request.json()

    // Validate required fields
    if (!body.name || !body.displayName) {
      return NextResponse.json(
        { success: false, error: 'Name and display name are required' },
        { status: 400 }
      )
    }

    // Set church ID from authenticated user
    body.churchId = user.churchId || ''

    const tag = await DynamicTaggingManager.createTag(body, user.id)

    return NextResponse.json({
      success: true,
      data: tag,
      message: 'Tag created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create tag error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create tag'
    const statusCode = errorMessage.includes('already exists') ? 409 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update tags
    if (!['ADMIN', 'CLERGY', 'STAFF'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'tag',
        'UPDATE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    const tag = await DynamicTaggingManager.updateTag(id, updates, user.id)

    return NextResponse.json({
      success: true,
      data: tag,
      message: 'Tag updated successfully'
    })
  } catch (error) {
    console.error('Update tag error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update tag'
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

    // Check if user has permission to delete tags
    if (!['ADMIN', 'CLERGY'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'tag',
        'DELETE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    await DynamicTaggingManager.deleteTag(id, user.id)

    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully'
    })
  } catch (error) {
    console.error('Delete tag error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete tag'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
