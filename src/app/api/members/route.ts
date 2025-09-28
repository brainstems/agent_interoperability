import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'
import { CreateMemberForm, MemberFilters } from '@/types'
import { publishMemberCreated } from '@/lib/crm-event-publisher'
import { CustomFieldManager } from '@/lib/custom-field-management'
import { AuditHelpers } from '@/lib/audit-logging'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const filtersParam = searchParams.get('filters')
    
    let filters: MemberFilters = {}
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch (e) {
        // Invalid JSON, ignore filters
      }
    }

    const offset = (page - 1) * limit

    // Build Supabase query with enhanced relations
    let query = supabase
      .from('profiles')
      .select(`
        *,
        families:family_members(
          family:families(*)
        ),
        group_memberships:group_members(
          group:groups(id, name, group_type)
        ),
        donations(id, amount, donation_date),
        tasks_assigned:tasks!tasks_assigned_to_fkey(id, title, status, priority, due_date),
        tasks_created:tasks!tasks_created_by_fkey(id, title, status, priority, due_date),
        communications_sent:communications!communications_sender_id_fkey(id, subject, communication_type, sent_at),
        event_registrations(id, event:events(id, title, start_datetime)),
        event_attendance(id, event:events(id, title, start_datetime), attended)
      `, { count: 'exact' })
      .eq('church_id', user.churchId)

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply status filters
    if (filters.memberStatus && filters.memberStatus.length > 0) {
      query = query.in('member_status', filters.memberStatus)
    }

    if (filters.gender && filters.gender.length > 0) {
      query = query.in('gender', filters.gender)
    }

    if (filters.maritalStatus && filters.maritalStatus.length > 0) {
      query = query.in('marital_status', filters.maritalStatus)
    }

    // Age range filter
    if (filters.ageRange) {
      const [minAge, maxAge] = filters.ageRange
      const now = new Date()
      const maxBirthDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate())
      const minBirthDate = new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate())
      
      query = query
        .gte('birth_date', minBirthDate.toISOString())
        .lte('birth_date', maxBirthDate.toISOString())
    }

    // Handle custom field search if provided
    const customFieldSearch = searchParams.get('customFieldSearch')
    let customFieldFilteredIds: string[] = []
    
    if (customFieldSearch) {
      try {
        const searchCriteria = JSON.parse(customFieldSearch)
        customFieldFilteredIds = await CustomFieldManager.searchByCustomFields(
          user.churchId || '',
          'MEMBER',
          searchCriteria
        )
        
        // If custom field search returns no results, return empty
        if (customFieldFilteredIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          })
        }
        
        // Filter query by custom field results
        query = query.in('id', customFieldFilteredIds)
      } catch (e) {
        console.error('Custom field search error:', e)
      }
    }

    // Get members with pagination
    const { data: members, error, count } = await query
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Enhance members with custom field data
    const enhancedMembers = await Promise.all(
      (members || []).map(async (member) => {
        try {
          const customFields = await CustomFieldManager.getFieldValues(
            user.churchId || '',
            'MEMBER',
            member.id
          )
          return {
            ...member,
            customFields,
            // Add computed fields for better UX
            fullName: `${member.first_name} ${member.last_name}`,
            age: member.birth_date ? 
              Math.floor((Date.now() - new Date(member.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            memberSince: member.join_date ? 
              Math.floor((Date.now() - new Date(member.join_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            totalDonations: member.donations?.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0) || 0,
            donationCount: member.donations?.length || 0,
            groupCount: member.group_memberships?.length || 0,
            taskCount: (member.tasks_assigned?.length || 0) + (member.tasks_created?.length || 0),
            communicationCount: member.communications_sent?.length || 0,
            eventCount: (member.event_registrations?.length || 0) + (member.event_attendance?.length || 0)
          }
        } catch (error) {
          console.error(`Failed to get custom fields for member ${member.id}:`, error)
          return {
            ...member,
            customFields: {},
            fullName: `${member.first_name} ${member.last_name}`,
            age: null,
            memberSince: null,
            totalDonations: 0,
            donationCount: 0,
            groupCount: 0,
            taskCount: 0,
            communicationCount: 0,
            eventCount: 0
          }
        }
      })
    )

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    // Log audit event for member data access
    await AuditHelpers.logMemberViewed(
      user.churchId || '',
      user.id,
      enhancedMembers.length,
      { search, filters, customFieldSearch },
      request
    )

    return NextResponse.json({
      success: true,
      data: enhancedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      metadata: {
        searchApplied: !!search,
        filtersApplied: Object.keys(filters).length > 0,
        customFieldSearchApplied: !!customFieldSearch
      }
    })
  } catch (error) {
    console.error('Get members error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get members'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
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
    const { customFields, ...memberData }: CreateMemberForm & { customFields?: Record<string, any> } = body

    // Validate required fields
    if (!memberData.firstName || !memberData.lastName) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Validate custom fields if provided
    if (customFields) {
      const fieldDefinitions = await CustomFieldManager.getFieldDefinitions(
        user.churchId || '',
        'MEMBER',
        { isVisible: true }
      )
      
      for (const [fieldName, value] of Object.entries(customFields)) {
        const fieldDef = fieldDefinitions.find(f => f.name === fieldName)
        if (fieldDef) {
          const validation = await CustomFieldManager.validateFieldValue(fieldDef.id!, value)
          if (!validation.isValid) {
            return NextResponse.json(
              { success: false, error: `Invalid value for ${fieldDef.displayName}: ${validation.errors.join(', ')}` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Validate email format if provided
    if (memberData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(memberData.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const { data: existingMember } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', memberData.email)
        .eq('church_id', user.churchId)
        .single()

      if (existingMember) {
        return NextResponse.json(
          { success: false, error: 'Member with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Create member profile
    const { data: member, error } = await supabase
      .from('profiles')
      .insert({
        church_id: user.churchId,
        first_name: memberData.firstName,
        last_name: memberData.lastName,
        email: memberData.email,
        phone: memberData.phone,
        address: memberData.address,
        birth_date: memberData.birthDate,
        gender: memberData.gender,
        marital_status: memberData.maritalStatus,
        member_status: memberData.memberStatus || 'VISITOR',
        join_date: new Date().toISOString().split('T')[0], // Set join date to today
        role: 'MEMBER', // Default role for new members
        is_active: true
      })
      .select(`
        *,
        families:family_members(
          family:families(*)
        ),
        group_memberships:group_members(
          group:groups(id, name, group_type)
        )
      `)
      .single()

    if (error) {
      throw error
    }

    // Set custom field values if provided
    if (customFields && Object.keys(customFields).length > 0) {
      const fieldDefinitions = await CustomFieldManager.getFieldDefinitions(
        user.churchId || '',
        'MEMBER',
        { isVisible: true }
      )
      
      for (const [fieldName, value] of Object.entries(customFields)) {
        const fieldDef = fieldDefinitions.find(f => f.name === fieldName)
        if (fieldDef && value !== null && value !== undefined && value !== '') {
          try {
            await CustomFieldManager.setFieldValue(
              user.churchId || '',
              fieldDef.id!,
              member.id,
              'MEMBER',
              value,
              user.id
            )
          } catch (fieldError) {
            console.error(`Failed to set custom field ${fieldName}:`, fieldError)
            // Continue with other fields even if one fails
          }
        }
      }
    }

    // Publish member.created event to trigger AI agent workflows
    try {
      await publishMemberCreated(
        member.id,
        user.churchId || '',
        {
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          phone: member.phone,
          memberStatus: member.member_status,
          gender: member.gender,
          maritalStatus: member.marital_status,
          birthDate: member.birth_date,
          isNewMember: true
        },
        user.id
      )

      // Track member registration engagement
      const { trackMemberRegistration } = await import('@/lib/engagement-tracker')
      await trackMemberRegistration(member.id, user.churchId || '', {
        firstName: member.first_name,
        lastName: member.last_name,
        registrationMethod: 'api'
      })
    } catch (eventError) {
      // Log event publishing error but don't fail the member creation
      console.error('Failed to publish member.created event:', eventError)
    }

    // Get the complete member data with custom fields for response
    const memberWithCustomFields = {
      ...member,
      customFields: customFields || {},
      fullName: `${member.first_name} ${member.last_name}`,
      age: member.birth_date ? 
        Math.floor((Date.now() - new Date(member.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
    }

    // Log audit event for member creation
    await AuditHelpers.logMemberCreated(
      user.churchId || '',
      user.id,
      member.id,
      memberWithCustomFields,
      request
    )

    return NextResponse.json({
      success: true,
      data: memberWithCustomFields,
      message: 'Member created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create member error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create member'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
