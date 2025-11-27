import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'favorites' | 'logout'>('overview')

  // Show loading only during initial auth check and only if we have no user at all
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="animate-pulse text-[#502038]">Načítám...</div>
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
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="animate-pulse text-[#502038]">Přesměrovávám...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    { id: 'overview' as const, label: 'Přehled účtu' },
    { id: 'orders' as const, label: 'Moje objednávky' },
    { id: 'favorites' as const, label: 'Oblíbené produkty' },
    { id: 'logout' as const, label: 'Odhlásit se', isLogout: true },
  ]

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <Navigation />
      <div className="pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="w-full md:w-[280px] flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6 sticky top-24">
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.isLogout ? handleLogout() : setActiveTab(item.id)}
                      className={`block w-full text-left px-4 py-3 rounded-md transition-all duration-200 font-serif relative ${
                        activeTab === item.id && !item.isLogout
                          ? 'bg-[#E0C36C]/10 text-[#502038] font-semibold'
                          : 'text-[#502038]/70 hover:text-[#502038] hover:bg-[#F4F1EA]'
                      }`}
                      style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                    >
                      {activeTab === item.id && !item.isLogout && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#E0C36C] rounded-l-md"></span>
                      )}
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="mb-8">
                    <h1 className="text-5xl font-serif font-bold text-[#502038] mb-2">
                      Vítejte, {user && user.firstName && user.firstName.trim() ? user.firstName : 'Uživateli'}
                    </h1>
                    <p className="text-[#502038]/70 text-lg">
                      Spravujte své údaje a nastavení účtu
                    </p>
                  </div>

                  {/* Personal Information Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Osobní údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2">Jméno</span>
                        <p className="text-base text-[#502038]">
                          {user && user.firstName && user.firstName.trim() 
                            ? user.firstName 
                            : 'Nevyplněno'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2">Příjmení</span>
                        <p className="text-base text-[#502038]">
                          {user && user.lastName && user.lastName.trim() 
                            ? user.lastName 
                            : 'Nevyplněno'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Kontaktní údaje</h2>
                    <div>
                      <span className="text-sm font-medium text-[#502038]/60 block mb-2">Email</span>
                      <p className="text-base text-[#502038]">
                        {user && user.email && user.email.trim() 
                          ? user.email 
                          : 'Nevyplněno'}
                      </p>
                    </div>
                  </div>

                  {/* Address Information Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Adresa</h2>
                    <div>
                      {user?.address && user.address.address1 && user.address.address1.trim() ? (
                        <p className="text-base text-[#502038] leading-relaxed">
                          {user.address.address1}
                          {user.address.address2 && user.address.address2.trim() && `, ${user.address.address2}`}
                          {user.address.city && user.address.city.trim() && `, ${user.address.city}`}
                          {user.address.zip && user.address.zip.trim() && ` ${user.address.zip}`}
                          {user.address.country && user.address.country.trim() && `, ${user.address.country}`}
                        </p>
                      ) : (
                        <p className="text-base text-[#502038]">Nevyplněno</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="mb-8">
                    <h1 className="text-5xl font-serif font-bold text-[#502038] mb-2">Moje objednávky</h1>
                    <p className="text-[#502038]/70 text-lg">
                      Historie vašich objednávek
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-12 text-center">
                    <p className="text-[#502038]/70 text-lg font-serif">
                      Zatím nemáte žádné objednávky
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="space-y-6">
                  <div className="mb-8">
                    <h1 className="text-5xl font-serif font-bold text-[#502038] mb-2">Oblíbené produkty</h1>
                    <p className="text-[#502038]/70 text-lg">
                      Produkty, které jste si označili jako oblíbené
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-12 text-center">
                    <p className="text-[#502038]/70 text-lg font-serif">
                      Zatím nemáte žádné oblíbené produkty
                    </p>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}