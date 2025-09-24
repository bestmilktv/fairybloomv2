import React, { createContext, useContext, useState, useEffect } from 'react'
import { createCustomer, loginCustomer } from '@/lib/shopify'

// User interface for authenticated customer
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Registration data interface
interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  passwordConfirmation: string
  acceptsMarketing: boolean
  address: {
    address1: string
    city: string
    zip: string
    country: string
  }
}

// Authentication context interface
interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Local storage key for customer token
const TOKEN_STORAGE_KEY = 'shopifyCustomerToken'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Computed property for authentication status
  const isAuthenticated = !!token && !!user

  /**
   * Initialize authentication state from localStorage on app start
   */
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (storedToken) {
          setToken(storedToken)
          // For minimal implementation, we'll set a basic user object
          // In a full implementation, you might want to fetch customer details
          // using the token to get the complete user information
          setUser({
            id: 'customer-id', // This would come from a customer details API call
            firstName: 'Customer',
            lastName: 'User',
            email: 'customer@example.com'
          })
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear invalid token
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  /**
   * Register a new customer account
   * Creates customer account and automatically logs them in
   */
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Create customer account
      const createResult = await createCustomer(data)
      
      if (!createResult.success) {
        const errorMessage = createResult.errors?.[0]?.message || 'Registration failed'
        return { success: false, error: errorMessage }
      }

      // Automatically log in the newly created customer
      const loginResult = await loginCustomer(data.email, data.password)
      
      if (!loginResult.success) {
        const errorMessage = loginResult.errors?.[0]?.message || 'Auto-login failed after registration'
        return { success: false, error: errorMessage }
      }

      // Store token and user info
      const accessToken = loginResult.accessToken
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
      setToken(accessToken)
      setUser({
        id: createResult.customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
      })

      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Login an existing customer
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      const result = await loginCustomer(email, password)
      
      if (!result.success) {
        const errorMessage = result.errors?.[0]?.message || 'Login failed'
        return { success: false, error: errorMessage }
      }

      // Store token and basic user info
      const accessToken = result.accessToken
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
      setToken(accessToken)
      
      // For minimal implementation, we'll set basic user info
      // In a full implementation, you'd fetch complete customer details
      setUser({
        id: 'customer-id', // This would come from a customer details API call
        firstName: 'Customer',
        lastName: 'User',
        email: email
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout the current customer
   * Clears token and user state
   */
  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setToken(null)
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    loading,
    register,
    login,
    logout,
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