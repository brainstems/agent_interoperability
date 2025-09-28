'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { 
  DatabaseRole, 
  UIRoleCategory, 
  Permission,
  mapDatabaseRoleToUI,
  hasPermission,
  getUserPermissions,
  getRoleDisplayInfo
} from '@/lib/role-permissions'

type Profile = {
  id: string
  church_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: any | null
  birth_date: string | null
  gender: string | null
  marital_status: string | null
  member_status: string
  join_date: string | null
  role: DatabaseRole
  bio: string | null
  photo_url: string | null
  interests: string[] | null
  life_events: any
  connection_preferences: any
  embedding: string | null
  custom_fields: any
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  // Role and Permission Methods
  userRole: UIRoleCategory
  userPermissions: Permission[]
  hasPermission: (permission: Permission) => boolean
  canAccess: (requiredPermissions: Permission[]) => boolean
  getRoleInfo: () => { category: UIRoleCategory; display: string; color: string }
  // Authentication Methods
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Derived role and permission state
  const userRole: UIRoleCategory = profile?.role ? mapDatabaseRoleToUI(profile.role) : 'lay'
  const userPermissions: Permission[] = profile ? getUserPermissions(profile) : []

  // Permission checking methods
  const checkPermission = (permission: Permission): boolean => {
    return profile ? hasPermission(profile, permission) : false
  }

  const canAccess = (requiredPermissions: Permission[]): boolean => {
    if (!profile || requiredPermissions.length === 0) return true
    return requiredPermissions.some(permission => checkPermission(permission))
  }

  const getRoleInfo = () => {
    return getRoleDisplayInfo(userRole)
  }

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id)
          setProfile(userProfile)
          
          // Update last login
          if (userProfile) {
            await supabase
              .from('profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id)
          setProfile(userProfile)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      setLoading(true)
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // If user was created, create their profile
      if (data.user) {
        const profileData = {
          id: data.user.id,
          email: data.user.email!,
          role: (userData.role as DatabaseRole) || 'MEMBER', // Default to MEMBER role
          ...userData,
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)

        if (profileError) {
          console.error('Error creating profile:', profileError)
          // Note: We don't return this error as the user was successfully created
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: new Error(error.message) }
      }

      // Refresh profile data
      await refreshProfile()
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id)
      setProfile(userProfile)
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    // Role and Permission Methods
    userRole,
    userPermissions,
    hasPermission: checkPermission,
    canAccess,
    getRoleInfo,
    // Authentication Methods
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Permission-based component wrapper
export function PermissionGate({ 
  children, 
  requiredPermissions, 
  fallback = null 
}: { 
  children: React.ReactNode
  requiredPermissions: Permission[]
  fallback?: React.ReactNode
}) {
  const { canAccess } = useAuth()
  
  if (!canAccess(requiredPermissions)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Role-based component wrapper
export function RoleGate({ 
  children, 
  allowedRoles, 
  fallback = null 
}: { 
  children: React.ReactNode
  allowedRoles: UIRoleCategory[]
  fallback?: React.ReactNode
}) {
  const { userRole } = useAuth()
  
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
