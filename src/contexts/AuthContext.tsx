import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: any | null
  profile: any | null
  session: any | null
  loading: boolean
  isAdmin: boolean
  signUp: (data: SignUpData) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: any) => Promise<{ error: any }>
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
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const signUp = async (data: SignUpData): Promise<{ error: any }> => {
    // Placeholder implementation - no actual auth
    console.log('Sign up requested:', data.email)
    return { error: new Error('Authentication not implemented') }
  }

  const signIn = async (email: string, password: string): Promise<{ error: any }> => {
    // Placeholder implementation - no actual auth
    console.log('Sign in requested:', email)
    return { error: new Error('Authentication not implemented') }
  }

  const signOut = async (): Promise<{ error: any }> => {
    // Placeholder implementation - no actual auth
    console.log('Sign out requested')
    setUser(null)
    setProfile(null)
    setSession(null)
    setIsAdmin(false)
    return { error: null }
  }

  const updateProfile = async (updates: any): Promise<{ error: any }> => {
    // Placeholder implementation - no actual auth
    console.log('Update profile requested:', updates)
    return { error: new Error('Authentication not implemented') }
  }

  const refreshProfile = async (): Promise<void> => {
    // Placeholder implementation - no actual auth
    console.log('Refresh profile requested')
  }

  const value: AuthContextType = {
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}