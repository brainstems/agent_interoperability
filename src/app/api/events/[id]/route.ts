import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'
import { CreateEventForm } from '@/types'

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.substring(7)
  const user = await AuthService.getCurrentUser(token)

  if (!user || !user.churchId) {
    throw new Error('Invalid or expired token')
  }

  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    const { id } = params

    const event = await prisma.event.findFirst({
      where: {
        id,
        churchId: user.churchId!
      },
      include: {
        registrations: {
          include: {
            member: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true,
                email: true,
                phone: true 
              }
            }
          },
          orderBy: { registrationDate: 'asc' }
        },
        attendance: {
          include: {
            member: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true 
              }
            }
          }
        },
        checkIns: {
          include: {
            member: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true 
              }
            }
          },
          orderBy: { checkInTime: 'desc' }
        },
        _count: {
          select: {
            registrations: true,
            attendance: true,
            checkIns: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Get event error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get event'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    const { id } = params
    const body: Partial<CreateEventForm> = await request.json()

    // Check if event exists and belongs to user's church
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        churchId: user.churchId!
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Validate dates if provided
    if (body.startDateTime && body.endDateTime) {
      const startDate = new Date(body.startDateTime)
      const endDate = new Date(body.endDateTime)

      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'End date/time must be after start date/time' },
          { status: 400 }
        )
      }
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        startDateTime: body.startDateTime ? new Date(body.startDateTime) : undefined,
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : undefined,
        location: body.location,
        eventType: body.eventType,
        registrationRequired: body.registrationRequired,
        maxAttendees: body.maxAttendees
      },
      include: {
        _count: {
          select: {
            registrations: true,
            attendance: true,
            checkIns: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    })
  } catch (error) {
    console.error('Update event error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update event'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    const { id } = params

    // Check if event exists and belongs to user's church
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        churchId: user.churchId!
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Delete event (cascade will handle related records)
    await prisma.event.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Delete event error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event'
    const statusCode = errorMessage.includes('token') ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
