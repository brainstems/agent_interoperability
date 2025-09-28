import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { LoginCredentials } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const result = await AuthService.login(email, password)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    const statusCode = errorMessage === 'Invalid credentials' ? 401 : 500

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}
