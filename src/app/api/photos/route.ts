import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: galleries, error } = await supabase
      .from('photo_galleries')
      .select(`
        *,
        photos(id, file_url, caption, uploaded_at)
      `)
      .eq('church_id', user.churchId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: galleries || []
    })
  } catch (error) {
    console.error('Get photo galleries error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get photo galleries' },
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
    const { name, description, event_id } = body

    const { data: gallery, error } = await supabase
      .from('photo_galleries')
      .insert({
        church_id: user.churchId,
        name,
        description,
        event_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: gallery
    }, { status: 201 })
  } catch (error) {
    console.error('Create photo gallery error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create photo gallery' },
      { status: 500 }
    )
  }
}
