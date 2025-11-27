import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { User, Package, Heart, LogOut, ChevronRight, Pencil } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion, logout } = useAuth()
  const { getFavoriteCount } = useFavorites()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'favorites' | 'logout'>('overview')

  if (loading && !user) return <div className="min-h-screen bg-[#F4F1EA]" />

  // Refresh user data logic
  useEffect(() => {
    const refreshData = async () => {
      if (!loading) await refreshUser(true, false).catch(console.error)
    }
    refreshData()
  }, [location.pathname, loading])

  if (!user) {
    window.location.href = '/'
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const menuItems = [
    { id: 'overview' as const, label: 'Přehled účtu', icon: User },
    { id: 'orders' as const, label: 'Moje objednávky', icon: Package },
    { id: 'favorites' as const, label: `Oblíbené (${getFavoriteCount()})`, icon: Heart },
    { id: 'logout' as const, label: 'Odhlásit se', icon: LogOut, isLogout: true },
  ]

  const EditButton = () => (
    <button className="p-2 bg-[#F4F1EA] rounded-full text-[#502038] hover:bg-[#E0C36C] hover:text-white transition-all duration-300 shadow-sm">
      <Pencil className="w-4 h-4" />
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <Navigation />
      
      <div className="pt-32 pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#502038] mb-4">
              Vítejte, {user.firstName || 'Uživateli'}
            </h1>
            <p className="text-[#502038]/70 text-lg font-light">
              Váš osobní prostor pro správu účtu
            </p>
          </div>

          {/* GRID: Bez 'items-start', aby se sloupce natáhly na výšku */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            
            {/* LEVÝ SLOUPEC: Slouží jako kolejnice pro sticky */}
            <aside className="lg:col-span-3 h-full">
              
              {/* STICKY MENU: */}
              {/* top-32 = odstup od vrchu */}
              {/* self-start = důležité, aby se element neroztahoval, ale držel svou velikost */}
              <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 overflow-hidden py-2 sticky top-32 self-start transition-all duration-300">
                <div className="space-y-1 p-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.isLogout ? handleLogout() : setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm group ${
                        activeTab === item.id && !item.isLogout
                          ? 'bg-[#E0C36C] text-white shadow-md'
                          : item.isLogout 
                            ? 'text-red-500 hover:bg-red-50' 
                            : 'text-[#502038]/80 hover:bg-[#F4F1EA] hover:text-[#502038]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={`w-4 h-4 ${activeTab === item.id && !item.isLogout ? 'text-white' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {!item.isLogout && activeTab === item.id && <ChevronRight className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* PRAVÝ OBSAH */}
            <main className="lg:col-span-9 min-w-0">
              
              {activeTab === 'overview' && (
                <div className="space-y-6 fade-in-up">
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-[#502038]">Osobní údaje</h2>
                      <EditButton />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Jméno</span>
                        <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">{user.firstName || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Příjmení</span>
                        <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">{user.lastName || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-[#502038]">Kontaktní údaje</h2>
                      <EditButton />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#502038]/40 uppercase tracking-wider block mb-1">Email</span>
                      <p className="text-lg text-[#502038] font-medium border-b border-[#502038]/10 pb-2">{user.email || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-[#502038]">Doručovací adresa</h2>
                      <EditButton />
                    </div>
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

              {activeTab === 'orders' && (
                <div className="space-y-6 fade-in-up">
                  <div className="bg-white rounded-xl shadow-sm border border-[#502038]/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-[#502038]/40" />
                    </div>
                    <h3 className="text-2xl font-serif text-[#502038] mb-2">Žádné objednávky</h3>
                    <p className="text-[#502038]/60 max-w-md mx-auto">
                      Zatím jste u nás nenakoupili.
                    </p>
                    <button onClick={() => navigate('/nahrdelniky')} className="mt-6 px-6 py-3 bg-[#502038] text-white rounded-full hover:bg-[#502038]/90 transition-colors">
                      Prohlédnout kolekci
                    </button>
                  </div>
                </div>
              )}

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