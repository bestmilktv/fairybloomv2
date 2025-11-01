import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion } = useAuth()
  const location = useLocation()

  // Show loading only during initial auth check and only if we have no user at all
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám...</div>
      </div>
    )
  }

  // Refresh user data when component mounts or when navigating to this page
  useEffect(() => {
    const refreshData = async () => {
      // Always refresh to get latest data from Shopify when ProfilePage is viewed
      // Wait for loading to complete
      if (!loading) {
        console.log('ProfilePage: Refreshing user data from Shopify...')
        try {
          // Always refresh when ProfilePage mounts or when navigating to it
          // Skip modal check - we don't want modal to show when visiting ProfilePage
          await refreshUser(true, false)
          // Also explicitly set needsProfileCompletion to false to ensure modal doesn't show
          setNeedsProfileCompletion(false)
          console.log('ProfilePage: Refresh completed')
        } catch (error) {
          console.error('ProfilePage: Error refreshing user data:', error)
        }
      }
    }
    
    refreshData()
    // Refresh whenever location changes (navigation to this page) or loading completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, loading]) // Refresh when navigating to this page or when loading completes

  // Log user data when it changes
  useEffect(() => {
    console.log('ProfilePage: User object changed:', {
      user: user,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      address: user?.address,
      address1: user?.address?.address1,
      city: user?.address?.city,
      zip: user?.address?.zip,
      country: user?.address?.country
    })
  }, [user])

  // If no user after loading is complete, redirect immediately
  if (!user) {
    window.location.href = '/'
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Přesměrovávám...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold text-luxury mb-4">
              Můj profil
            </h1>
            <p className="text-muted-foreground">
              Spravujte své údaje a nastavení účtu
            </p>
          </div>

          {/* Display User Information */}
          <section className="p-6 rounded-lg shadow bg-white">
            <h2 className="text-lg font-semibold mb-4">Vaše údaje</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-base">
                  {user && user.email && user.email.trim() 
                    ? user.email 
                    : 'Nevyplněno'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Jméno:</span>
                <p className="text-base">
                  {user && user.firstName && user.firstName.trim() 
                    ? user.firstName 
                    : 'Nevyplněno'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Příjmení:</span>
                <p className="text-base">
                  {user && user.lastName && user.lastName.trim() 
                    ? user.lastName 
                    : 'Nevyplněno'}
                </p>
              </div>
              {user?.address && user.address.address1 && user.address.address1.trim() ? (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Adresa:</span>
                  <p className="text-base">
                    {user.address.address1}
                    {user.address.address2 && user.address.address2.trim() && `, ${user.address.address2}`}
                    {user.address.city && user.address.city.trim() && `, ${user.address.city}`}
                    {user.address.zip && user.address.zip.trim() && ` ${user.address.zip}`}
                    {user.address.country && user.address.country.trim() && `, ${user.address.country}`}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Adresa:</span>
                  <p className="text-base">Nevyplněno</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}