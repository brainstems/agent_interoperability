import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { CustomFieldManager, CustomFieldDefinition, FieldScope } from '@/lib/custom-field-management'
import { AuditHelpers } from '@/lib/audit-logging'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') as FieldScope
    const isVisible = searchParams.get('isVisible')
    const groupName = searchParams.get('groupName')
    const isSearchable = searchParams.get('isSearchable')

    if (!scope) {
      return NextResponse.json({ error: 'Scope parameter is required' }, { status: 400 })
    }

    const filters: any = {}
    if (isVisible !== null) filters.isVisible = isVisible === 'true'
    if (groupName) filters.groupName = groupName
    if (isSearchable !== null) filters.isSearchable = isSearchable === 'true'

    const definitions = await CustomFieldManager.getFieldDefinitions(
      user.churchId || '',
      scope,
      filters
    )

    return NextResponse.json({
      success: true,
      data: definitions
    })
  } catch (error) {
    console.error('Get field definitions error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get field definitions'
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
      await AuditHelpers.logPermissionDenied('', '', 'custom_field_definition', 'CREATE', request)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create field definitions
    if (!['ADMIN', 'CLERGY'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'custom_field_definition',
        'CREATE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: CustomFieldDefinition = await request.json()

    // Validate required fields
    if (!body.name || !body.displayName || !body.fieldType || !body.scope) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, displayName, fieldType, scope' },
        { status: 400 }
      )
    }

    // Validate field options for SELECT/MULTISELECT types
    if (['SELECT', 'MULTISELECT'].includes(body.fieldType) && (!body.fieldOptions || body.fieldOptions.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Field options are required for SELECT and MULTISELECT types' },
        { status: 400 }
      )
    }

    // Set church ID from authenticated user
    body.churchId = user.churchId || ''

    const definition = await CustomFieldManager.createFieldDefinition(body, user.id)

    return NextResponse.json({
      success: true,
      data: definition,
      message: 'Field definition created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create field definition error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create field definition'
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

    // Check if user has permission to update field definitions
    if (!['ADMIN', 'CLERGY'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'custom_field_definition',
        'UPDATE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Field definition ID is required' }, { status: 400 })
    }

    const definition = await CustomFieldManager.updateFieldDefinition(id, updates, user.id)

    return NextResponse.json({
      success: true,
      data: definition,
      message: 'Field definition updated successfully'
    })
  } catch (error) {
    console.error('Update field definition error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update field definition'
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

    // Check if user has permission to delete field definitions
    if (!['ADMIN', 'CLERGY'].includes(user.role || '')) {
      await AuditHelpers.logPermissionDenied(
        user.churchId || '',
        user.id,
        'custom_field_definition',
        'DELETE',
        request
      )
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Field definition ID is required' }, { status: 400 })
    }

    await CustomFieldManager.deleteFieldDefinition(id, user.id)

    return NextResponse.json({
      success: true,
      message: 'Field definition deleted successfully'
    })
  } catch (error) {
    console.error('Delete field definition error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete field definition'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
