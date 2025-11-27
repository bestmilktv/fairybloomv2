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

  // Show loading only during initial auth check
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="animate-pulse text-[#502038]">Načítám...</div>
      </div>
    )
  }

  // Refresh user data logic
  useEffect(() => {
    const refreshData = async () => {
      if (!loading) {
        try {
          await refreshUser(true, false)
          setNeedsProfileCompletion(false)
        } catch (error) {
          console.error('ProfilePage: Error refreshing user data:', error)
        }
      }
    }
    refreshData()
  }, [location.pathname, loading])

  // Redirect if no user
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
      
      {/* Hlavní padding odshora */}
      <div className="pt-32 pb-12">
        <div className="max-w-[1200px] mx-auto px-6">
          
          {/* HLAVNÍ NADPIS - Vycentrovaný */}
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="text-5xl font-serif font-bold text-[#502038] mb-3">
              Vítejte, {user && user.firstName && user.firstName.trim() ? user.firstName : 'Uživateli'}
            </h1>
            <p className="text-[#502038]/70 text-lg">
              Spravujte své údaje a nastavení účtu na jednom místě
            </p>
          </div>

          {/* GRID LAYOUT - Klíčové pro fungující sticky sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
            
            {/* SIDEBAR (Sticky) */}
            {/* md:col-span-3 (nebo 4) určuje šířku sloupce */}
            {/* sticky top-32 zajistí přilepení pod navbarem */}
            <aside className="md:col-span-4 lg:col-span-3 md:sticky md:top-32 z-10">
              <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6 overflow-hidden">
                <div className="space-y-2 w-full">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.isLogout ? handleLogout() : setActiveTab(item.id)}
                      className={`block w-full text-left px-4 py-3 rounded-md transition-all duration-200 font-serif relative ${
                        activeTab === item.id && !item.isLogout
                          ? 'bg-[#E0C36C]/10 text-[#502038] font-semibold'
                          : 'text-[#502038]/70 hover:text-[#502038] hover:bg-[#F4F1EA]'
                      }`}
                    >
                      {activeTab === item.id && !item.isLogout && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#E0C36C] rounded-l-md"></span>
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="md:col-span-8 lg:col-span-9 min-w-0">
              
              {/* Sekce: Přehled účtu */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Karta: Osobní údaje */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-8">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Osobní údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2 uppercase tracking-wide">Jméno</span>
                        <p className="text-lg text-[#502038]">
                          {user && user.firstName && user.firstName.trim() ? user.firstName : 'Nevyplněno'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2 uppercase tracking-wide">Příjmení</span>
                        <p className="text-lg text-[#502038]">
                          {user && user.lastName && user.lastName.trim() ? user.lastName : 'Nevyplněno'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Karta: Kontaktní údaje */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-8">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Kontaktní údaje</h2>
                    <div>
                      <span className="text-sm font-medium text-[#502038]/60 block mb-2 uppercase tracking-wide">Email</span>
                      <p className="text-lg text-[#502038]">
                        {user && user.email && user.email.trim() ? user.email : 'Nevyplněno'}
                      </p>
                    </div>
                  </div>

                  {/* Karta: Adresa */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-8">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Adresa</h2>
                    <div>
                      {user?.address && user.address.address1 && user.address.address1.trim() ? (
                        <p className="text-lg text-[#502038] leading-relaxed">
                          {user.address.address1}
                          {user.address.address2 && user.address.address2.trim() && `, ${user.address.address2}`}
                          <br />
                          {user.address.city && user.address.city.trim() && `${user.address.city}`}
                          {user.address.zip && user.address.zip.trim() && `, ${user.address.zip}`}
                          <br />
                          {user.address.country && user.address.country.trim() && `${user.address.country}`}
                        </p>
                      ) : (
                        <p className="text-lg text-[#502038] italic opacity-60">Adresa není vyplněna</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sekce: Objednávky */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#502038]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-serif text-[#502038] mb-2">Žádné objednávky</h3>
                    <p className="text-[#502038]/60">
                      Zatím jste u nás nenakoupili.
                    </p>
                  </div>
                </div>
              )}

              {/* Sekce: Oblíbené */}
              {activeTab === 'favorites' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#502038]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-serif text-[#502038] mb-2">Seznam přání je prázdný</h3>
                    <p className="text-[#502038]/60">
                      Zatím jste si neoznačili žádné produkty jako oblíbené.
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