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
        
        // Check if we're returning from OAuth redirect (mobile)
        const urlParams = new URLSearchParams(window.location.search)
        const oauthSuccess = urlParams.get('oauth_success')
        const oauthError = urlParams.get('oauth_error')
        
        if (oauthSuccess === 'true') {
          // OAuth redirect was successful - user just logged in
          console.log('[Auth] OAuth redirect successful, refreshing user data...')
          
          // Clear URL parameters
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
          
          // Mark that user just logged in
          setJustLoggedIn(true)
          
          // OPTIMIZATION: Try to get customer data from localStorage (set by callback)
          // This allows optimistic update on mobile too
          try {
            const storedCustomer = localStorage.getItem('fairybloom_customer');
            if (storedCustomer) {
              const customerData = JSON.parse(storedCustomer);
              if (customerData && customerData.sub) {
                setUser({
                  id: customerData.sub || '',
                  firstName: customerData.given_name || customerData.first_name || '',
                  lastName: customerData.family_name || customerData.last_name || '',
                  email: customerData.email || '',
                  address: undefined,
                  acceptsMarketing: false
                });
                setLoading(false); // Show user as logged in immediately
              }
            }
          } catch (e) {
            console.warn('[Auth] Could not parse stored customer data:', e);
          }
          
          // OPTIMIZATION: Reduced wait time from 500ms to 200ms
          // Cookie should be available faster
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // Refresh user data in background (non-blocking if we have optimistic data)
          refreshUser(false, true).catch(error => {
            console.error('Background user refresh failed:', error);
            // If refresh fails, we still have optimistic state
          })
        } else if (oauthError === 'true') {
          // OAuth redirect failed
          const errorMessage = urlParams.get('error_message') || 'Přihlášení se nezdařilo'
          console.error('[Auth] OAuth redirect error:', errorMessage)
          
          // Clear URL parameters
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
          
          // Show error toast (if available)
          // Note: toast might not be available here, so we'll just log it
        } else {
          // Normal page load - directly try to fetch customer data
          // fetchCustomerProfile will return null if not authenticated (401),
          // so we don't need a separate isCustomerAuthenticated check
          // This saves one API call and speeds up initialization
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
   * On mobile: uses full-page redirect (promise never resolves)
   * On desktop: uses popup (promise resolves with result)
   */
  const loginWithSSO = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Check if mobile device (will use redirect)
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 768 ||
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          navigator.userAgent.toLowerCase()
        )
      )

      if (isMobile) {
        // Mobile: redirect mode - initiate redirect and return immediately
        // The actual login will be handled when user returns from OAuth
        await initiateOAuthFlow()
        // Promise never resolves on mobile (user is redirected)
        // Return success immediately - actual result handled in useEffect
        return { success: true }
      }

      // Desktop: popup mode - wait for result
      const result = await initiateOAuthFlow()
      
      if (!result.success) {
        return { success: false, error: result.error || 'SSO login failed' }
      }

      // Mark that user just logged in - this will allow modal to show if needed
      setJustLoggedIn(true)
      
      // OPTIMIZATION: Optimistically set user as authenticated immediately
      // Use basic data from OAuth token if available, or create minimal user object
      // This makes UI update instantly while we fetch full profile in background
      if (result.customer) {
        setUser({
          id: result.customer.sub || '',
          firstName: result.customer.given_name || '',
          lastName: result.customer.family_name || '',
          email: result.customer.email || '',
          address: undefined,
          acceptsMarketing: false
        })
      }
      
      // Set loading to false immediately so UI shows user as logged in
      setLoading(false)
      
      // Fetch full customer data in background (non-blocking)
      // Don't await - let it happen in background
      refreshUser(false, true).catch(error => {
        console.error('Background user refresh failed:', error)
        // If refresh fails, we still have optimistic state
      })
      
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
          errorMessage = 'Přihlášení bylo zrušeno.'
        }
      }
      
      return { success: false, error: errorMessage }
    } finally {
      // Only set loading to false on desktop (popup mode)
      // On mobile, user is redirected, so loading state doesn't matter
      // Note: Loading is already set to false above for optimistic update
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 768 ||
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          navigator.userAgent.toLowerCase()
        )
      )
      if (!isMobile && loading) {
        // Only set if still loading (error case)
        setLoading(false)
      }
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
          if (value === undefined || value === null) {
            return false;
          }
          if (typeof value !== 'string') {
            return false;
          }
          const trimmed = value.trim();
          return trimmed.length > 0;
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
            country: customerData.address.country,
            // Debug: show raw values
            address1Type: typeof customerData.address.address1,
            address1Length: customerData.address.address1?.length,
            cityType: typeof customerData.address.city,
            cityLength: customerData.address.city?.length,
            zipType: typeof customerData.address.zip,
            zipLength: customerData.address.zip?.length,
            countryType: typeof customerData.address.country,
            countryLength: customerData.address.country?.length,
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
        // Improved validation with detailed logging
        const hasFirstName = hasValue(customerData.firstName)
        const hasLastName = hasValue(customerData.lastName)
        
        // Check if address exists and has all required fields
        const addressExists = !!customerData.address;
        const hasAddress1 = addressExists && hasValue(customerData.address.address1)
        const hasCity = addressExists && hasValue(customerData.address.city)
        const hasZip = addressExists && hasValue(customerData.address.zip)
        const hasCountry = addressExists && hasValue(customerData.address.country)
        
        // Debug logging for address validation
        if (addressExists) {
          console.log('Address validation details:', {
            address1: {
              value: customerData.address.address1,
              hasValue: hasAddress1,
              type: typeof customerData.address.address1
            },
            city: {
              value: customerData.address.city,
              hasValue: hasCity,
              type: typeof customerData.address.city
            },
            zip: {
              value: customerData.address.zip,
              hasValue: hasZip,
              type: typeof customerData.address.zip
            },
            country: {
              value: customerData.address.country,
              hasValue: hasCountry,
              type: typeof customerData.address.country
            }
          });
        } else {
          console.log('No address object found in customer data');
        }
        
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
      phone?: string
    }
    acceptsMarketing?: boolean
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/customer/admin-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
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