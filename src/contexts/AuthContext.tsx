import React, { createContext, useContext, useState, useEffect } from 'react'
import { initiateOAuthFlow, OAuthResult } from '@/lib/oauth'
import { fetchCustomerProfile, logoutCustomer, isCustomerAuthenticated } from '@/lib/customerAccountApi'

// User interface for authenticated customer
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  address?: {
    address1: string
    address2?: string
    city: string
    province?: string
    zip: string
    country: string
    phone?: string
  }
  acceptsMarketing?: boolean
}

// Authentication context interface
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  needsProfileCompletion: boolean
  loginWithSSO: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: (skipModalCheck?: boolean, checkJustLoggedIn?: boolean) => Promise<void>
  updateProfile: (updates: { 
    firstName?: string
    lastName?: string
    address?: {
      address1: string
      address2?: string
      city: string
      province?: string
      zip: string
      country: string
      phone?: string
    }
    acceptsMarketing?: boolean
  }) => Promise<{ success: boolean; error?: string }>
  setNeedsProfileCompletion: (needs: boolean) => void
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)
  const [justLoggedIn, setJustLoggedIn] = useState(false) // Track if user just logged in

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
          // Fetch customer data, but don't set justLoggedIn - this is just page load
          // Skip modal check since this is not a fresh login
          setJustLoggedIn(false)
          await refreshUser(true, false)
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

      // Mark that user just logged in - this will allow modal to show if needed
      setJustLoggedIn(true)
      
      // Wait longer for cookie to be set after OAuth callback
      // Cookie needs time to propagate after OAuth popup closes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // OAuth was successful, fetch customer data with retry
      // Pass checkJustLoggedIn=true to ensure modal check uses the correct flag
      await refreshUser(false, true)
      
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
  const refreshUser = async (skipModalCheck: boolean = false, checkJustLoggedIn: boolean = false): Promise<void> => {
    try {
      const customerData = await fetchCustomerProfile()
      
      if (customerData) {
        // Helper function to check if a string value is actually filled (not empty/whitespace)
        const hasValue = (value: string | undefined | null): boolean => {
          return value !== undefined && value !== null && typeof value === 'string' && value.trim().length > 0
        }

        console.log('Refreshing user data from Shopify (raw API response):', {
          id: customerData.id,
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          hasAddress: !!customerData.address,
          addressDetails: customerData.address ? {
            address1: customerData.address.address1,
            city: customerData.address.city,
            zip: customerData.address.zip,
            country: customerData.address.country
          } : null
        })

        const userData = {
          id: customerData.id,
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          email: customerData.email || '',
          address: customerData.address,
          acceptsMarketing: customerData.acceptsMarketing
        }

        console.log('Setting user state with:', JSON.stringify(userData, null, 2))

        setUser(userData)
        
        // Check if profile needs completion - all required fields must have non-empty values
        const hasFirstName = hasValue(customerData.firstName)
        const hasLastName = hasValue(customerData.lastName)
        const hasAddress1 = customerData.address?.address1 && hasValue(customerData.address.address1)
        const hasCity = customerData.address?.city && hasValue(customerData.address.city)
        const hasZip = customerData.address?.zip && hasValue(customerData.address.zip)
        const hasCountry = customerData.address?.country && hasValue(customerData.address.country)
        
        const needsCompletion = !hasFirstName || !hasLastName || !hasAddress1 || !hasCity || !hasZip || !hasCountry
        
        // Determine if we should check justLoggedIn flag
        // If checkJustLoggedIn is explicitly provided (not undefined), use it
        // Otherwise, use the current state value
        const shouldCheckJustLoggedIn = checkJustLoggedIn !== undefined ? checkJustLoggedIn : justLoggedIn
        
        console.log('Profile completion check:', {
          hasFirstName,
          hasLastName,
          hasAddress1,
          hasCity,
          hasZip,
          hasCountry,
          needsCompletion,
          justLoggedIn: shouldCheckJustLoggedIn,
          skipModalCheck
        })

        // Only show modal if:
        // 1. User just logged in (shouldCheckJustLoggedIn === true)
        // 2. Profile needs completion (needsCompletion === true)
        // 3. Not skipping modal check (skipModalCheck === false)
        // If user is just refreshing page or visiting ProfilePage, don't show modal
        if (skipModalCheck) {
          setNeedsProfileCompletion(false)
          // Reset justLoggedIn when skipping modal check (e.g., from ProfilePage)
          if (!checkJustLoggedIn) {
            setJustLoggedIn(false)
          }
        } else {
          const shouldShowModal = needsCompletion && shouldCheckJustLoggedIn
          setNeedsProfileCompletion(shouldShowModal)
          
          // If profile is complete or modal should not be shown, reset justLoggedIn
          if (!needsCompletion || !shouldCheckJustLoggedIn) {
            setJustLoggedIn(false)
          }
          
          console.log('Modal visibility decision:', {
            shouldShowModal,
            needsCompletion,
            shouldCheckJustLoggedIn
          })
        }
      } else {
        console.log('No customer data received from API')
        setUser(null)
        setNeedsProfileCompletion(false)
        setJustLoggedIn(false)
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
      setUser(null)
      setNeedsProfileCompletion(false)
      setJustLoggedIn(false)
    }
  }

  /**
   * Update customer profile information using Shopify Admin API via backend
   * This avoids CORS issues with Customer Account API
   */
  const updateProfile = async (updates: { 
    firstName?: string
    lastName?: string
    address?: {
      address1: string
      address2?: string
      city: string
      province?: string
      zip: string
      country: string
      countryCode?: string
      phone?: string
    }
    acceptsMarketing?: boolean
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize country to countryCode if needed
      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.address?.country && !normalizedUpdates.address.countryCode) {
        // Convert country name to code if it's a known country
        const countryName = normalizedUpdates.address.country;
        if (countryName === 'Czech Republic' || countryName === 'Czechia') {
          normalizedUpdates.address.countryCode = 'CZ';
        } else if (countryName.length === 2) {
          normalizedUpdates.address.countryCode = countryName.toUpperCase();
        } else {
          normalizedUpdates.address.countryCode = countryName;
        }
      }

      const response = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(normalizedUpdates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Aktualizace profilu se nezdařila.' }))
        return { success: false, error: errorData.error || 'Aktualizace profilu se nezdařila.' }
      }

      const updatedData = await response.json()
      
      if (updatedData) {
        // Wait for Shopify to fully process the update - retry logic
        let retries = 3
        let customerData = null
        
        while (retries > 0 && !customerData) {
          await new Promise(resolve => setTimeout(resolve, 800))
          
          try {
            const refreshed = await fetchCustomerProfile()
            if (refreshed && refreshed.firstName && refreshed.address?.address1) {
              customerData = refreshed
            }
          } catch (error) {
            console.warn('Retry fetching customer data:', retries, error)
          }
          
          retries--
        }
        
        // Refresh user data from Shopify to get the latest state
        // Reset justLoggedIn after update to prevent modal from showing again
        setJustLoggedIn(false)
        await refreshUser(true, false)
        
        // refreshUser will set needsProfileCompletion correctly based on actual data
        return { success: true }
      } else {
        return { success: false, error: 'Aktualizace profilu se nezdařila.' }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
      return { success: false, error: 'Nastala neočekávaná chyba.' }
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
    needsProfileCompletion,
    loginWithSSO,
    logout,
    refreshUser,
    updateProfile,
    setNeedsProfileCompletion,
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