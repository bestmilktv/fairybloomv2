import React, { createContext, useContext, useState, useEffect } from 'react'
import { initiateOAuthFlow, OAuthResult } from '@/lib/oauth'
import { fetchCustomerProfile, logoutCustomer, isCustomerAuthenticated } from '@/lib/customerAccountApi'

// User interface for authenticated customer
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Authentication context interface
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  loginWithSSO: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Computed property for authentication status
  const isAuthenticated = !!user

  /**
   * Initialize authentication state by checking if user is authenticated
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Check if customer is authenticated via Customer Account API
        const isAuth = await isCustomerAuthenticated()
        if (isAuth) {
          // Fetch customer data
          await refreshUser()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  /**
   * Login with Shopify SSO using OAuth 2.0 + PKCE
   */
  const loginWithSSO = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      const result = await initiateOAuthFlow()
      
      if (!result.success) {
        return { success: false, error: result.error || 'SSO login failed' }
      }

      // OAuth was successful, fetch customer data
      await refreshUser()
      
      // Try to associate existing cart with newly authenticated customer
      const cartId = localStorage.getItem('fairybloom-cart-id');
      if (cartId && result.accessToken) {
        try {
          const { associateCustomerWithCart } = await import('@/lib/shopify');
          await associateCustomerWithCart(cartId, result.accessToken);
          console.log('Existing cart associated with authenticated customer');
        } catch (error) {
          console.error('Error associating existing cart:', error);
          // Don't fail login if cart association fails
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('SSO login error:', error)
      let errorMessage = 'SSO login failed. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('Popup was blocked')) {
          errorMessage = 'Popup was blocked. Please allow popups for this site and try again.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Login timed out. Please try again.'
        } else if (error.message.includes('cancelled')) {
          errorMessage = 'Přihlášení se nezdařilo.'
        }
      }
      
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Refresh user data from Customer Account API
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const customerData = await fetchCustomerProfile()
      
      if (customerData) {
        setUser({
          id: customerData.id,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
      setUser(null)
    }
  }

  /**
   * Logout the current customer
   * Clears authentication and user state
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true)
      
      // Call logout endpoint to clear server-side cookies
      await logoutCustomer()
      
      // Clear local state
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Even if server logout fails, clear local state
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    loginWithSSO,
    logout,
    refreshUser,
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