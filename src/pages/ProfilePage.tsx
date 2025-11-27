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

  // Refresh user data logic (beze změny)
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
      
      {/* Hlavní padding odshora (pod navbar) */}
      <div className="pt-32 pb-12">
        <div className="max-w-[1200px] mx-auto px-6">
          
          {/* HLAVNÍ NADPIS PRO CELOU STRÁNKU (Zarovnání vlevo) */}
          <div className="mb-10">
            <h1 className="text-5xl font-serif font-bold text-[#502038] mb-2">
              Vítejte, {user && user.firstName && user.firstName.trim() ? user.firstName : 'Uživateli'}
            </h1>
            <p className="text-[#502038]/70 text-lg">
              Spravujte své údaje a nastavení účtu
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start relative">
            
            {/* SIDEBAR (Sticky) */}
            {/* 'sticky top-32' zajistí, že se menu přilepí 8rem (32*4px = 128px) od vrchu okna */}
            <aside className="w-full md:w-[280px] flex-shrink-0 md:sticky md:top-32 self-start transition-all duration-300">
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
            <main className="flex-1 min-w-0">
              
              {/* Sekce: Přehled účtu */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Zde už NENÍ nadpis "Vítejte", protože je nahoře společný */}
                  
                  {/* Karta: Osobní údaje */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Osobní údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2">Jméno</span>
                        <p className="text-base text-[#502038]">
                          {user && user.firstName && user.firstName.trim() ? user.firstName : 'Nevyplněno'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[#502038]/60 block mb-2">Příjmení</span>
                        <p className="text-base text-[#502038]">
                          {user && user.lastName && user.lastName.trim() ? user.lastName : 'Nevyplněno'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Karta: Kontaktní údaje */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-6">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Kontaktní údaje</h2>
                    <div>
                      <span className="text-sm font-medium text-[#502038]/60 block mb-2">Email</span>
                      <p className="text-base text-[#502038]">
                        {user && user.email && user.email.trim() ? user.email : 'Nevyplněno'}
                      </p>
                    </div>
                  </div>

                  {/* Karta: Adresa */}
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

              {/* Sekce: Objednávky */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-[#502038]/10 p-12 text-center">
                    <p className="text-[#502038]/70 text-lg font-serif">
                      Zatím nemáte žádné objednávky
                    </p>
                  </div>
                </div>
              )}

              {/* Sekce: Oblíbené */}
              {activeTab === 'favorites' && (
                <div className="space-y-6">
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