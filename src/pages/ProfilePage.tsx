import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion } = useAuth()

  // Show loading only during initial auth check and only if we have no user at all
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám...</div>
      </div>
    )
  }

  // Refresh user data when component mounts to ensure we have latest data from Shopify
  useEffect(() => {
    const refreshData = async () => {
      if (!loading) {
        console.log('ProfilePage: Refreshing user data from Shopify...')
        // Always refresh when ProfilePage mounts to get latest data from Shopify
        // Skip modal check - we don't want modal to show when visiting ProfilePage
        await refreshUser(true)
        // Also explicitly set needsProfileCompletion to false to ensure modal doesn't show
        setNeedsProfileCompletion(false)
      }
    }
    
    refreshData()
  }, []) // Only run once on mount

  // Log user data when it changes
  useEffect(() => {
    if (user) {
      console.log('ProfilePage: User data updated:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hasAddress: !!user.address,
        address: user.address
      })
    }
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
                <span className="text-sm font-medium text-muted-foreground">Jméno:</span>
                <p className="text-base">{user?.firstName || 'Nevyplněno'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Příjmení:</span>
                <p className="text-base">{user?.lastName || 'Nevyplněno'}</p>
              </div>
              {user?.address ? (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Adresa:</span>
                  <p className="text-base">
                    {user.address.address1}
                    {user.address.address2 && `, ${user.address.address2}`}
                    {user.address.city && `, ${user.address.city}`}
                    {user.address.zip && ` ${user.address.zip}`}
                    {user.address.country && `, ${user.address.country}`}
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