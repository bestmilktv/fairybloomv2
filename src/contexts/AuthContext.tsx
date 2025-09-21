import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signUp: (data: SignUpData) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: 'male' | 'female' | 'other'
  newsletterConsent: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Computed admin status with multiple fallbacks
  const isAdmin = React.useMemo(() => {
    // Check profile first
    if (profile?.role === 'admin') return true
    
    // Check user metadata as fallback
    if (user?.user_metadata?.role === 'admin') return true
    
    // Check JWT claims as additional fallback
    if (user?.app_metadata?.role === 'admin') return true
    
    return false
  }, [profile, user])

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('Initial session:', session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state change:', event, session?.user?.id)
      
      // Clear error state on new auth events
      setProfileError(null)
      
      // Update session and user immediately
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user && event === 'SIGNED_IN') {
        console.log('User authenticated, fetching profile:', session.user.id)
        setLoading(true)
        await fetchProfile(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session?.user && !profile) {
        // Only fetch profile on token refresh if we don't have one yet
        console.log('Token refreshed, fetching profile if missing:', session.user.id)
        setLoading(true)
        await fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing state')
        setProfile(null)
        setProfileError(null)
        setLoading(false)
      } else if (!session?.user) {
        setProfile(null)
        setProfileError(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 3
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff
    
    try {
      console.log(`Fetching profile for user: ${userId} (attempt ${retryCount + 1})`)
      setProfileError(null)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error.code, error.message)
        
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // Profile not found - this is ok for new users
          console.log('Profile not found - new user or profile creation pending')
          setProfile(null)
          setProfileError('Profile not found')
          setLoading(false)
          return
        }
        
        if (error.code === '42P17') {
          // Infinite recursion - critical database issue
          console.error('Database RLS policy error - infinite recursion detected')
          setProfileError('Database configuration error')
          setProfile(null)
          setLoading(false)
          return
        }
        
        // For other errors, retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`Retrying profile fetch in ${retryDelay}ms...`)
          setTimeout(() => fetchProfile(userId, retryCount + 1), retryDelay)
          return
        }
        
        // Max retries exceeded
        console.error('Max retries exceeded for profile fetch')
        setProfileError(`Unable to load profile: ${error.message}`)
        setProfile(null)
        setLoading(false)
        return
      }

      if (data) {
        console.log('Profile fetched successfully:', data.email, 'Role:', data.role)
        setProfile(data)
        setProfileError(null)
      } else {
        console.log('No profile data returned')
        setProfile(null)
        setProfileError('No profile data')
      }
      
      setLoading(false)
    } catch (error: any) {
      console.error('Unexpected error fetching profile:', error)
      
      // Retry for network errors
      if (retryCount < maxRetries && (error.name === 'NetworkError' || error.message?.includes('fetch'))) {
        console.log(`Network error, retrying in ${retryDelay}ms...`)
        setTimeout(() => fetchProfile(userId, retryCount + 1), retryDelay)
        return
      }
      
      setProfileError(`Network error: ${error.message}`)
      setProfile(null)
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      setLoading(true)
      await fetchProfile(user.id)
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      console.log('Starting signup process for:', data.email)
      
      // Match the database trigger metadata keys
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,  // This matches the trigger
            last_name: data.lastName,    // This matches the trigger
            gender: data.gender,         // This matches the trigger
            newsletter_consent: data.newsletterConsent, // This matches the trigger
          }
        }
      })

      if (error) {
        console.error('Signup error:', error)
        return { error }
      }

      console.log('Signup successful, user created:', authData.user?.id)
      
      // Wait a moment for the trigger to create the profile
      if (authData.user) {
        setTimeout(() => {
          fetchProfile(authData.user.id)
        }, 1000)
      }
      
      return { error: null }
    } catch (error) {
      console.error('Unexpected signup error:', error)
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Starting signin process for:', email)
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Signin error:', error)
        return { error }
      }

      console.log('Signin successful for user:', data.user?.id)
      return { error: null }
    } catch (error) {
      console.error('Unexpected signin error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out process...')
      
      // Clear local state immediately for better UX
      setUser(null)
      setProfile(null)
      setSession(null)
      setProfileError(null)
      setLoading(false)
      
      // Sign out from Supabase with global scope to ensure complete logout
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.error('AuthContext: Supabase sign out error:', error)
        // Still continue with cleanup even if Supabase signout fails
      }
      
      console.log('AuthContext: Sign out successful')
      
      // Clear all browser storage
      try {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear specific Supabase keys if general clear doesn't work
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        )
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (storageError) {
        console.warn('Error clearing storage:', storageError)
      }
      
      // Handle navigation from protected pages
      const currentPath = window.location.pathname
      const protectedPaths = ['/profile', '/orders', '/admin']
      
      if (protectedPaths.includes(currentPath)) {
        console.log('AuthContext: Redirecting from protected page:', currentPath)
        // Use replace to prevent back button issues
        window.location.replace('/')
      }
      
      return { error: null }
    } catch (error) {
      console.error('AuthContext: Unexpected error during sign out:', error)
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}