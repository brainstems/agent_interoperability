import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const fundId = searchParams.get('fundId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build Supabase query
    let query = supabase
      .from('pledges')
      .select(`
        *,
        member:profiles(id, first_name, last_name, email, phone),
        fund:funds(id, name)
      `, { count: 'exact' })
      .eq('church_id', user.churchId)

    // Apply filters
    if (memberId) {
      query = query.eq('member_id', memberId)
    }
    if (fundId) {
      query = query.eq('fund_id', fundId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Get pledges with pagination
    const { data: pledges, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    const total = count || 0

    return NextResponse.json({
      data: pledges,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching pledges:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      member_id,
      fund_id,
      pledge_amount,
      frequency,
      start_date,
      end_date,
      notes
    } = body

    if (!member_id || !pledge_amount || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: member_id, pledge_amount, frequency' },
        { status: 400 }
      )
    }

    const { data: pledge, error } = await supabase
      .from('pledges')
      .insert({
        church_id: user.churchId,
        member_id,
        fund_id,
        pledge_amount: parseFloat(pledge_amount),
        frequency,
        start_date: start_date ? start_date : new Date().toISOString().split('T')[0],
        end_date: end_date || null,
        notes,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        member:profiles(id, first_name, last_name, email, phone),
        fund:funds(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: pledge }, { status: 201 })
  } catch (error) {
    console.error('Error creating pledge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      pledge_amount,
      frequency,
      start_date,
      end_date,
      notes,
      status
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Pledge ID is required' }, { status: 400 })
    }

    // Verify pledge belongs to user's church
    const { data: existingPledge, error: checkError } = await supabase
      .from('pledges')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingPledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (pledge_amount !== undefined) updateData.pledge_amount = parseFloat(pledge_amount)
    if (frequency !== undefined) updateData.frequency = frequency
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    const { data: pledge, error } = await supabase
      .from('pledges')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        member:profiles(id, first_name, last_name, email, phone),
        fund:funds(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: pledge })
  } catch (error) {
    console.error('Error updating pledge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Pledge ID is required' }, { status: 400 })
    }

    // Verify pledge belongs to user's church
    const { data: existingPledge, error: checkError } = await supabase
      .from('pledges')
      .select('id')
      .eq('id', id)
      .eq('church_id', user.churchId)
      .single()

    if (checkError || !existingPledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('pledges')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Pledge deleted successfully' })
  } catch (error) {
    console.error('Error deleting pledge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
