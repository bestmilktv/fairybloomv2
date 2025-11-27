import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext' // Přidáno pro počet oblíbených
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { User, Package, Heart, LogOut, ChevronRight } from 'lucide-react' // Ikony pro hezčí vzhled

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion, logout } = useAuth()
  const { getFavoriteCount } = useFavorites()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'favorites' | 'logout'>('overview')

  // Loading state
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
    { id: 'overview' as const, label: 'Přehled účtu', icon: User },
    { id: 'orders' as const, label: 'Moje objednávky', icon: Package },
    { id: 'favorites' as const, label: `Oblíbené produkty (${getFavoriteCount()})`, icon: Heart },
    { id: 'logout' as const, label: 'Odhlásit se', icon: LogOut, isLogout: true },
  ]

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <Navigation />
      
      {/* Hlavní padding odshora */}
      <div className="pt-32 pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          
          {/* 1. HLAVNÍ NADPIS - Vytažený nad grid pro čisté zarovnání */}
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#502038] mb-4">
              Vítejte, {user && user.firstName ? user.firstName : 'Uživateli'}
            </h1>
            <p className="text-[#502038]/70 text-lg font-light">
              Váš osobní prostor pro správu objednávek a přání
            </p>
          </div>

          {/* 2. GRID LAYOUT - items-start je klíčové pro sticky sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
            
            {/* SIDEBAR */}
            {/* sticky top-32 = přilepí se 128px od vrchu okna (pod navbarem) */}
            <aside className="lg:col-span-3 lg:sticky lg:top-32 z-10">
              <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 overflow-hidden">
                <div className="p-4 bg-[#502038]/5 border-b border-[#502038]/10">
                  <span className="text-xs font-bold text-[#502038] uppercase tracking-widest">Menu</span>
                </div>
                <div className="p-2 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isLogout = item.isLogout;

                    return (
                      <button
                        key={item.id}
                        onClick={() => isLogout ? handleLogout() : setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm group ${
                          isActive && !isLogout
                            ? 'bg-[#E0C36C] text-white shadow-md'
                            : isLogout 
                              ? 'text-red-500 hover:bg-red-50' 
                              : 'text-[#502038]/80 hover:bg-[#F4F1EA] hover:text-[#502038]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${isActive && !isLogout ? 'text-white' : ''}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {!isLogout && isActive && <ChevronRight className="w-4 h-4 text-white" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="lg:col-span-9 min-w-0">
              
              {/* Sekce: Přehled účtu */}
              {activeTab === 'overview' && (
                <div className="space-y-6 fade-in-up">
                  
                  {/* Karta: Osobní údaje */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-[#502038]">Osobní údaje</h2>
                      <div className="p-2 bg-[#F4F1EA] rounded-full text-[#502038]">
                        <User className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Jméno</span>
                        <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">
                          {user && user.firstName ? user.firstName : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Příjmení</span>
                        <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">
                          {user && user.lastName ? user.lastName : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Karta: Kontaktní údaje */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Kontaktní údaje</h2>
                    <div>
                      <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Email</span>
                      <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">
                        {user && user.email ? user.email : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Karta: Adresa */}
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <h2 className="text-2xl font-serif font-semibold text-[#502038] mb-6">Doručovací adresa</h2>
                    <div>
                      {user?.address && user.address.address1 ? (
                        <div className="text-lg text-[#502038] space-y-1">
                          <p>{user.address.address1}</p>
                          {user.address.address2 && <p>{user.address.address2}</p>}
                          <p>{user.address.city} {user.address.zip}</p>
                          <p>{user.address.country}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-[#502038]/50 bg-[#F4F1EA]/50 rounded-lg border border-dashed border-[#502038]/20">
                          <p>Adresa není vyplněna</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sekce: Objednávky */}
              {activeTab === 'orders' && (
                <div className="space-y-6 fade-in-up">
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-[#502038]/40" />
                    </div>
                    <h3 className="text-2xl font-serif text-[#502038] mb-2">Žádné objednávky</h3>
                    <p className="text-[#502038]/60 max-w-md mx-auto">
                      Zatím jste u nás nenakoupili. Objevte naše jedinečné šperky a udělejte si radost.
                    </p>
                    <button onClick={() => navigate('/nahrdelniky')} className="mt-6 px-6 py-3 bg-[#502038] text-white rounded-full hover:bg-[#502038]/90 transition-colors">
                      Prohlédnout kolekci
                    </button>
                  </div>
                </div>
              )}

              {/* Sekce: Oblíbené */}
              {activeTab === 'favorites' && (
                <div className="space-y-6 fade-in-up">
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-6">
                      <Heart className="w-10 h-10 text-[#502038]/40" />
                    </div>
                    <h3 className="text-2xl font-serif text-[#502038] mb-2">Seznam přání je prázdný</h3>
                    <p className="text-[#502038]/60 max-w-md mx-auto">
                      Označte si produkty srdíčkem, abyste je zde našli.
                    </p>
                    <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-[#E0C36C] text-white rounded-full hover:bg-[#E0C36C]/90 transition-colors shadow-lg shadow-[#E0C36C]/20">
                      Jít nakupovat
                    </button>
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