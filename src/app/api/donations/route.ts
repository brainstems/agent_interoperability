import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'
import { CreateDonationForm, DonationFilters } from '@/types'
import { publishDonationReceived } from '@/lib/crm-event-publisher'

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
    
    let filters: DonationFilters = {}
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch (e) {
        // Invalid JSON, ignore filters
      }
    }

    const offset = (page - 1) * limit

    // Build Supabase query
    let query = supabase
      .from('donations')
      .select(`
        *,
        member:profiles(id, first_name, last_name, email),
        fund:funds(id, name)
      `)
      .eq('church_id', user.churchId)

    // Apply search filter
    if (search) {
      query = query.or(`member.first_name.ilike.%${search}%,member.last_name.ilike.%${search}%,member.email.ilike.%${search}%`)
    }

    // Apply filters
    if (filters.fundId) {
      query = query.eq('fund_id', filters.fundId)
    }

    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      query = query.in('payment_method', filters.paymentMethod)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      query = query
        .gte('donation_date', filters.dateRange[0])
        .lte('donation_date', filters.dateRange[1])
    }

    if (filters.amountRange && filters.amountRange.length === 2) {
      query = query
        .gte('amount', filters.amountRange[0])
        .lte('amount', filters.amountRange[1])
    }

    // Get donations with pagination
    const { data: donations, error, count } = await query
      .order('donation_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Get total amount (separate query for aggregation)
    const { data: totalData } = await supabase
      .from('donations')
      .select('amount')
      .eq('church_id', user.churchId)

    const totalAmount = totalData?.reduce((sum, donation) => sum + (donation.amount || 0), 0) || 0
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: donations || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary: {
        totalAmount: totalAmount,
        averageAmount: total > 0 ? totalAmount / total : 0
      }
    })
  } catch (error) {
    console.error('Get donations error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get donations'
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
    const body: CreateDonationForm = await request.json()

    // Validate required fields
    if (!body.memberId || !body.fundId || !body.amount || !body.donationDate) {
      return NextResponse.json(
        { success: false, error: 'Member, fund, amount, and donation date are required' },
        { status: 400 }
      )
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Donation amount must be greater than zero' },
        { status: 400 }
      )
    }

    // Check if member exists and belongs to user's church
    const { data: member } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', body.memberId)
      .eq('church_id', user.churchId)
      .single()

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if fund exists and belongs to user's church
    const { data: fund } = await supabase
      .from('funds')
      .select('id, name')
      .eq('id', body.fundId)
      .eq('church_id', user.churchId)
      .single()

    if (!fund) {
      return NextResponse.json(
        { success: false, error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Create donation
    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        church_id: user.churchId,
        member_id: body.memberId,
        fund_id: body.fundId,
        amount: body.amount,
        donation_date: new Date(body.donationDate).toISOString(),
        payment_method: body.paymentMethod,
        check_number: body.checkNumber,
        notes: body.notes,
        is_recurring: body.isRecurring || false
      })
      .select(`
        *,
        member:profiles(id, first_name, last_name, email),
        fund:funds(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    // Publish donation.received event to trigger AI agent workflows
    try {
      await publishDonationReceived(
        donation.id,
        user.churchId || '',
        {
          amount: donation.amount,
          fundId: donation.fund_id,
          fundName: fund.name,
          memberId: donation.member_id,
          memberName: `${member.first_name} ${member.last_name}`,
          memberEmail: member.email,
          paymentMethod: donation.payment_method,
          donationDate: donation.donation_date,
          isRecurring: donation.is_recurring,
          checkNumber: donation.check_number,
          notes: donation.notes
        },
        user.id
      )
    } catch (eventError) {
      // Log event publishing error but don't fail the donation creation
      console.error('Failed to publish donation.received event:', eventError)
    }

    return NextResponse.json({
      success: true,
      data: donation,
      message: 'Donation recorded successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create donation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to record donation'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
