import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface User {
  id: string
  email: string
  password: string
  role: string
  church_id?: string
  created_at: string
  updated_at: string
}

interface Member {
  id: string
  user_id?: string
  first_name: string
  last_name: string
  email?: string
  church_id: string
  member_status: string
  created_at: string
  updated_at: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12')

export interface AuthenticatedUser extends User {
  memberProfile?: Member | null
  churchId?: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions)
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      return decoded
    } catch (error) {
      return null
    }
  }

  static async getCurrentUser(token: string): Promise<AuthenticatedUser | null> {
    try {
      const decoded = this.verifyToken(token)
      if (!decoded) return null

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single()

      if (!user || !user.church_id) return null

      // Get member profile if exists
      const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return {
        ...user,
        churchId: user.church_id,
        memberProfile
      } as AuthenticatedUser
    } catch (error) {
      return null
    }
  }

  static async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string } | null> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (!user) return null

      const isValidPassword = await this.comparePassword(password, user.password)
      if (!isValidPassword) return null

      const token = this.generateToken(user.id)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      // Create or update session
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('token', token)
        .single()

      if (existingSession) {
        await supabase
          .from('user_sessions')
          .update({ expires_at: expiresAt.toISOString() })
          .eq('token', token)
      } else {
        await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            token,
            expires_at: expiresAt.toISOString()
          })
      }

      // Get member profile
      const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const authenticatedUser: AuthenticatedUser = {
        ...user,
        churchId: user.church_id,
        memberProfile
      }

      return { user: authenticatedUser, token }
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }

  static async logout(token: string): Promise<boolean> {
    try {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('token', token)
      return true
    } catch (error) {
      return false
    }
  }

  static async refreshToken(token: string): Promise<string | null> {
    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('*, users(*)')
        .eq('token', token)
        .single()

      if (!session || new Date(session.expires_at) < new Date()) {
        return null
      }

      const newToken = this.generateToken(session.user_id)
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      // Update session with new token
      await supabase
        .from('user_sessions')
        .update({
          token: newToken,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('token', token)

      return newToken
    } catch (error) {
      return null
    }
  }

  static async createUser(userData: {
    email: string
    password: string
    role?: string
    churchId?: string
  }): Promise<AuthenticatedUser | null> {
    try {
      const hashedPassword = await this.hashPassword(userData.password)

      const { data: user } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password: hashedPassword,
          role: userData.role || 'MEMBER',
          church_id: userData.churchId
        })
        .select()
        .single()

      if (!user) return null

      // Get member profile if exists
      const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return {
        ...user,
        churchId: user.church_id,
        memberProfile
      } as AuthenticatedUser
    } catch (error) {
      console.error('Create user error:', error)
      return null
    }
  }

  static async validateSession(token: string): Promise<boolean> {
    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('expires_at')
        .eq('token', token)
        .single()

      return session ? new Date(session.expires_at) > new Date() : false
    } catch (error) {
      return false
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
    } catch (error) {
      console.error('Session cleanup error:', error)
    }
  }
}

// Export auth functions for API routes
export async function verifyAuth(request: Request): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return AuthService.getCurrentUser(token)
}

export async function auth(): Promise<{ user: AuthenticatedUser } | null> {
  // This is a placeholder for NextAuth compatibility
  // In a real implementation, this would get the current session
  return null
}
