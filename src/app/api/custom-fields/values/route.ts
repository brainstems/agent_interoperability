import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { CustomFieldManager, FieldScope } from '@/lib/custom-field-management'
import { AuditHelpers } from '@/lib/audit-logging'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recordType = searchParams.get('recordType') as FieldScope
    const recordId = searchParams.get('recordId')

    if (!recordType || !recordId) {
      return NextResponse.json({ 
        error: 'recordType and recordId parameters are required' 
      }, { status: 400 })
    }

    const values = await CustomFieldManager.getFieldValues(
      user.churchId || '',
      recordType,
      recordId
    )

    return NextResponse.json({
      success: true,
      data: values
    })
  } catch (error) {
    console.error('Get field values error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get field values'
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

    const body = await request.json()
    const { fieldDefinitionId, recordId, recordType, value } = body

    if (!fieldDefinitionId || !recordId || !recordType) {
      return NextResponse.json({
        error: 'fieldDefinitionId, recordId, and recordType are required'
      }, { status: 400 })
    }

    await CustomFieldManager.setFieldValue(
      user.churchId || '',
      fieldDefinitionId,
      recordId,
      recordType as FieldScope,
      value,
      user.id
    )

    return NextResponse.json({
      success: true,
      message: 'Field value set successfully'
    })
  } catch (error) {
    console.error('Set field value error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to set field value'
    const statusCode = errorMessage.includes('Validation failed') ? 400 : 500

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

    const body = await request.json()
    const { values } = body // Array of { fieldDefinitionId, recordId, recordType, value }

    if (!Array.isArray(values) || values.length === 0) {
      return NextResponse.json({
        error: 'values array is required'
      }, { status: 400 })
    }

    // Batch update field values
    const results = []
    for (const valueData of values) {
      try {
        await CustomFieldManager.setFieldValue(
          user.churchId || '',
          valueData.fieldDefinitionId,
          valueData.recordId,
          valueData.recordType as FieldScope,
          valueData.value,
          user.id
        )
        results.push({ success: true, fieldDefinitionId: valueData.fieldDefinitionId })
      } catch (error) {
        results.push({ 
          success: false, 
          fieldDefinitionId: valueData.fieldDefinitionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      data: results,
      message: `Updated ${successCount} field values${failureCount > 0 ? `, ${failureCount} failed` : ''}`
    })
  } catch (error) {
    console.error('Batch update field values error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update field values'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
