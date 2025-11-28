import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useCart } from '@/contexts/CartContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { User, Package, Heart, LogOut, ChevronRight, Pencil, ShoppingCart, X, Loader2, Check } from 'lucide-react'
import { getProductById } from '@/lib/shopify'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COUNTRIES, getCountryByCode } from '@/lib/countries'

interface FavoriteProduct {
  id: string
  title: string
  handle: string
  image: string
  price: string
  variantId?: string
}

export default function ProfilePage() {
  const { user, loading, refreshUser, setNeedsProfileCompletion, logout, updateProfile } = useAuth()
  const { favorites, getFavoriteCount, removeFromFavorites, isLoading: favoritesLoading } = useFavorites()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'favorites' | 'logout'>('overview')
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Edit states
  const [editingSection, setEditingSection] = useState<'personal' | 'contact' | 'address' | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form states for editing
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editAddress1, setEditAddress1] = useState('')
  const [editAddress2, setEditAddress2] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editZip, setEditZip] = useState('')
  const [editCountry, setEditCountry] = useState('CZ')
  const [editPhone, setEditPhone] = useState('')

  // Loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Načítám...</div>
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

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (editingSection && user) {
      if (editingSection === 'personal') {
        setEditFirstName(user.firstName || '')
        setEditLastName(user.lastName || '')
      } else if (editingSection === 'contact') {
        setEditEmail(user.email || '')
        // Telefon může být v adrese nebo na customer level
        setEditContactPhone(user.address?.phone || '')
      } else if (editingSection === 'address') {
        setEditAddress1(user.address?.address1 || '')
        setEditAddress2(user.address?.address2 || '')
        setEditCity(user.address?.city || '')
        setEditZip(user.address?.zip || '')
        setEditCountry(user.address?.country || 'CZ')
        setEditPhone(user.address?.phone || '')
      }
    }
  }, [editingSection, user])

  // Fetch favorite products when favorites tab is active
  useEffect(() => {
    if (activeTab === 'favorites') {
      if (favorites.length === 0) {
        setFavoriteProducts([])
        return
      }

      const fetchFavoriteProducts = async () => {
        setLoadingProducts(true)
        try {
          const products = await Promise.all(
            favorites.map(async (productId) => {
              try {
                const product = await getProductById(productId)
                if (!product) return null

                const firstImage = product.images?.edges?.[0]?.node
                const firstVariant = product.variants?.edges?.[0]?.node

                return {
                  id: product.id,
                  title: product.title,
                  handle: product.handle,
                  image: firstImage?.url || '',
                  price: firstVariant?.price
                    ? `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}`
                    : 'Cena na vyžádání',
                  variantId: firstVariant?.id,
                }
              } catch (error) {
                console.error(`Error fetching product ${productId}:`, error)
                return null
              }
            })
          )

          setFavoriteProducts(products.filter((p) => p !== null) as FavoriteProduct[])
        } catch (error) {
          console.error('Error fetching favorite products:', error)
        } finally {
          setLoadingProducts(false)
        }
      }

      fetchFavoriteProducts()
    }
  }, [activeTab, favorites])

  // Redirect if no user
  if (!user) {
    window.location.href = '/'
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Přesměrovávám...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFromFavorites(productId)
      toast({
        title: "Odebráno z oblíbených",
        description: "Produkt byl odebrán z vašich oblíbených.",
      })
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast({
        title: "Chyba",
        description: "Nepodařilo se odebrat produkt z oblíbených.",
        variant: "destructive",
      })
    }
  }

  const handleAddToCart = async (product: FavoriteProduct, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!product.variantId) {
      toast({
        title: "Chyba",
        description: "Produkt nemá dostupné varianty.",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingToCart(product.id)
      const priceNumber = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0

      await addToCart({
        id: product.id,
        name: product.title,
        price: priceNumber,
        image: product.image,
        category: 'Shopify Product',
        variantId: product.variantId,
        isShopifyProduct: true,
      })

      toast({
        title: "Přidáno do košíku",
        description: `${product.title} byl přidán do vašeho košíku.`,
      })
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Chyba při přidávání do košíku",
        description: "Nepodařilo se přidat produkt do košíku. Zkuste to prosím znovu.",
        variant: "destructive",
      })
    } finally {
      setAddingToCart(null)
    }
  }

  const handleSavePersonal = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast({
        title: "Chyba",
        description: "Jméno a příjmení jsou povinné.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const result = await updateProfile({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      })

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || "Nepodařilo se uložit změny.",
          variant: "destructive",
        })
        return
      }

      // Also save to Supabase
      try {
        const supabaseResponse = await fetch('/api/customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            firstName: editFirstName.trim(),
            lastName: editLastName.trim(),
            address1: user?.address?.address1 || '',
            address2: user?.address?.address2 || '',
            city: user?.address?.city || '',
            province: user?.address?.province || '',
            zip: user?.address?.zip || '',
            country: user?.address?.country || 'CZ',
            phone: user?.address?.phone || '',
            acceptsMarketing: false,
          })
        })

        if (!supabaseResponse.ok) {
          console.warn('[ProfilePage] Failed to save to Supabase, but Shopify save succeeded')
        }
      } catch (supabaseError) {
        console.warn('[ProfilePage] Error saving to Supabase:', supabaseError)
      }

      await refreshUser(true, false)
      setEditingSection(null)
      
      toast({
        title: "Úspěch",
        description: "Osobní údaje byly aktualizovány.",
      })
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAddress = async () => {
    if (!editAddress1.trim() || !editCity.trim() || !editZip.trim() || !editCountry.trim()) {
      toast({
        title: "Chyba",
        description: "Prosím vyplňte všechny povinné údaje o adrese.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const addressData = {
        address1: editAddress1.trim(),
        address2: editAddress2.trim() || undefined,
        city: editCity.trim(),
        province: '',
        zip: editZip.trim(),
        country: editCountry.trim(),
        phone: editPhone.trim() || undefined,
      }

      const result = await updateProfile({
        address: addressData,
      })

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || "Nepodařilo se uložit změny.",
          variant: "destructive",
        })
        return
      }

      // Also save to Supabase
      try {
        const supabaseResponse = await fetch('/api/customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            address1: addressData.address1,
            address2: addressData.address2,
            city: addressData.city,
            province: addressData.province,
            zip: addressData.zip,
            country: addressData.country,
            phone: addressData.phone,
            acceptsMarketing: false,
          })
        })

        if (!supabaseResponse.ok) {
          console.warn('[ProfilePage] Failed to save to Supabase, but Shopify save succeeded')
        }
      } catch (supabaseError) {
        console.warn('[ProfilePage] Error saving to Supabase:', supabaseError)
      }

      await refreshUser(true, false)
      setEditingSection(null)
      
      toast({
        title: "Úspěch",
        description: "Adresa byla aktualizována.",
      })
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContact = async () => {
    setSaving(true)
    try {
      // Telefon ukládáme do adresy, protože updateProfile podporuje jen address.phone
      // Použijeme existující adresu a aktualizujeme jen telefon
      if (!user?.address) {
        toast({
          title: "Chyba",
          description: "Pro uložení telefonu je nutné mít vyplněnou adresu. Prosím nejdříve vyplňte adresu.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      const addressData = {
        address1: user.address.address1,
        address2: user.address.address2 || undefined,
        city: user.address.city,
        province: user.address.province || '',
        zip: user.address.zip,
        country: user.address.country,
        phone: editContactPhone.trim() || undefined,
      }

      const result = await updateProfile({
        address: addressData,
      })

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || "Nepodařilo se uložit změny.",
          variant: "destructive",
        })
        return
      }

      // Also save to Supabase
      try {
        const supabaseResponse = await fetch('/api/customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            address1: addressData.address1,
            address2: addressData.address2,
            city: addressData.city,
            province: addressData.province,
            zip: addressData.zip,
            country: addressData.country,
            phone: editContactPhone.trim() || '',
            acceptsMarketing: false,
          })
        })

        if (!supabaseResponse.ok) {
          console.warn('[ProfilePage] Failed to save to Supabase, but Shopify save succeeded')
        }
      } catch (supabaseError) {
        console.warn('[ProfilePage] Error saving to Supabase:', supabaseError)
      }

      await refreshUser(true, false)
      setEditingSection(null)
      
      toast({
        title: "Úspěch",
        description: "Kontaktní údaje byly aktualizovány.",
      })
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
  }

  const menuItems = [
    { id: 'overview' as const, label: 'Přehled účtu', icon: User },
    { id: 'orders' as const, label: 'Moje objednávky', icon: Package },
    { id: 'favorites' as const, label: `Oblíbené produkty (${getFavoriteCount()})`, icon: Heart },
    { id: 'logout' as const, label: 'Odhlásit se', icon: LogOut, isLogout: true },
  ]

  const EditButton = ({ section }: { section: 'personal' | 'contact' | 'address' }) => (
    <button 
      onClick={() => setEditingSection(section)}
      disabled={editingSection !== null}
      className="p-2 bg-background rounded-full text-primary hover:bg-accent hover:text-white transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Pencil className="w-4 h-4" />
    </button>
  )

  const SaveButton = ({ onSave, disabled }: { onSave: () => void; disabled?: boolean }) => (
    <button
      onClick={onSave}
      disabled={disabled || saving}
      className="p-2 bg-accent rounded-full text-white hover:bg-accent/90 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}
    </button>
  )

  const CancelButton = ({ onCancel }: { onCancel: () => void }) => (
    <button
      onClick={onCancel}
      disabled={saving}
      className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <X className="w-4 h-4" />
    </button>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hlavní padding odshora */}
      <div className="pt-32 pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          
          {/* HLAVNÍ NADPIS */}
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">
              Vítejte, {user && user.firstName ? user.firstName : 'Uživateli'}
            </h1>
            <p className="text-primary/70 text-lg font-light">
              Váš osobní prostor pro správu objednávek a přání
            </p>
          </div>

          {/* GRID LAYOUT - ZMĚNA ZDE */}
          {/* 1. Odstranil jsem 'items-start'. Nyní se sloupce natáhnou na stejnou výšku. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            
            {/* SIDEBAR SLOUPER */}
            {/* 2. Odstranil jsem 'sticky' z tohoto wrapperu. Tento wrapper teď slouží jako "kolejnice" přes celou výšku. */}
            <aside className="lg:col-span-3">
              
              {/* 3. PŘIDAL JSEM STICKY SEM - na vnitřní kartu */}
              {/* sticky top-32: karta se přilepí k vrchu okna (s odstupem) a pojede dolů v rámci sloupce */}
              <div className="bg-white rounded-xl shadow-sm border border-primary/10 overflow-hidden py-2 lg:sticky lg:top-32 transition-all duration-300">
                <div className="space-y-1 p-2">
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
                            ? 'bg-accent text-white shadow-md'
                            : isLogout 
                              ? 'text-red-500 hover:bg-red-50' 
                              : 'text-primary/80 hover:bg-background hover:text-primary'
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
                  <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-primary">Osobní údaje</h2>
                      <div className="flex items-center gap-2">
                        {editingSection === 'personal' ? (
                          <>
                            <SaveButton onSave={handleSavePersonal} disabled={saving} />
                            <CancelButton onCancel={handleCancelEdit} />
                          </>
                        ) : (
                          <EditButton section="personal" />
                        )}
                      </div>
                    </div>
                    
                    {editingSection === 'personal' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="editFirstName" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Jméno</Label>
                          <Input
                            id="editFirstName"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            disabled={saving}
                            className="text-lg text-primary"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editLastName" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Příjmení</Label>
                          <Input
                            id="editLastName"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            disabled={saving}
                            className="text-lg text-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <span className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-1">Jméno</span>
                          <p className="text-lg text-primary font-medium border-b border-primary/10 pb-2">
                            {user && user.firstName ? user.firstName : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-1">Příjmení</span>
                          <p className="text-lg text-primary font-medium border-b border-primary/10 pb-2">
                            {user && user.lastName ? user.lastName : '-'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Karta: Kontaktní údaje */}
                  <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-primary">Kontaktní údaje</h2>
                      <div className="flex items-center gap-2">
                        {editingSection === 'contact' ? (
                          <>
                            <SaveButton onSave={handleSaveContact} disabled={saving} />
                            <CancelButton onCancel={handleCancelEdit} />
                          </>
                        ) : (
                          <EditButton section="contact" />
                        )}
                      </div>
                    </div>
                    {editingSection === 'contact' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editEmail" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Email</Label>
                          <Input
                            id="editEmail"
                            type="email"
                            value={editEmail}
                            disabled={true}
                            className="text-lg text-primary bg-gray-100"
                          />
                          <p className="text-sm text-primary/60 mt-2">Email nelze změnit. Kontaktujte prosím podporu.</p>
                        </div>
                        <div>
                          <Label htmlFor="editContactPhone" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Telefon (volitelné)</Label>
                          <Input
                            id="editContactPhone"
                            type="tel"
                            value={editContactPhone}
                            onChange={(e) => setEditContactPhone(e.target.value)}
                            disabled={saving}
                            placeholder="Např. +420 123 456 789"
                            className="text-lg text-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-1">Email</span>
                          <p className="text-lg text-primary font-medium border-b border-primary/10 pb-2">
                            {user && user.email ? user.email : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-1">Telefon</span>
                          <p className="text-lg text-primary font-medium border-b border-primary/10 pb-2">
                            {user?.address?.phone ? user.address.phone : '-'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Karta: Adresa */}
                  <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-8 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-serif font-semibold text-primary">Doručovací adresa</h2>
                      <div className="flex items-center gap-2">
                        {editingSection === 'address' ? (
                          <>
                            <SaveButton onSave={handleSaveAddress} disabled={saving} />
                            <CancelButton onCancel={handleCancelEdit} />
                          </>
                        ) : (
                          <EditButton section="address" />
                        )}
                      </div>
                    </div>
                    {editingSection === 'address' ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editAddress1" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Ulice a číslo popisné *</Label>
                          <Input
                            id="editAddress1"
                            value={editAddress1}
                            onChange={(e) => setEditAddress1(e.target.value)}
                            disabled={saving}
                            className="text-lg text-primary"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editAddress2" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Doplňující údaje (volitelné)</Label>
                          <Input
                            id="editAddress2"
                            value={editAddress2}
                            onChange={(e) => setEditAddress2(e.target.value)}
                            disabled={saving}
                            className="text-lg text-primary"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="editCity" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Město *</Label>
                            <Input
                              id="editCity"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              disabled={saving}
                              className="text-lg text-primary"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editZip" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">PSČ *</Label>
                            <Input
                              id="editZip"
                              value={editZip}
                              onChange={(e) => setEditZip(e.target.value)}
                              disabled={saving}
                              className="text-lg text-primary"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="editCountry" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Země *</Label>
                            <Select
                              value={editCountry}
                              onValueChange={setEditCountry}
                              disabled={saving}
                            >
                              <SelectTrigger id="editCountry" className="text-lg text-primary">
                                <SelectValue>
                                  {editCountry ? (getCountryByCode(editCountry)?.name || editCountry) : 'Vyberte zemi'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {COUNTRIES.map((countryOption) => (
                                  <SelectItem key={countryOption.code} value={countryOption.code}>
                                    {countryOption.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editPhone" className="text-xs font-bold text-primary/40 uppercase tracking-wider block mb-2">Telefon (volitelné)</Label>
                            <Input
                              id="editPhone"
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              disabled={saving}
                              className="text-lg text-primary"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {user?.address && user.address.address1 ? (
                          <div className="text-lg text-primary space-y-1">
                            <p>{user.address.address1}</p>
                            {user.address.address2 && <p>{user.address.address2}</p>}
                            <p>{user.address.city} {user.address.zip}</p>
                            <p>{user.address.country}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-primary/50 bg-background/50 rounded-lg border border-dashed border-primary/20">
                            <p>Adresa není vyplněna</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sekce: Objednávky */}
              {activeTab === 'orders' && (
                <div className="space-y-6 fade-in-up">
                  <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-primary/40" />
                    </div>
                    <h3 className="text-2xl font-serif text-primary mb-2">Žádné objednávky</h3>
                    <p className="text-primary/60 max-w-md mx-auto">
                      Zatím jste u nás nenakoupili. Objevte naše jedinečné šperky a udělejte si radost.
                    </p>
                    <button onClick={() => navigate('/nahrdelniky')} className="mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                      Prohlédnout kolekci
                    </button>
                  </div>
                </div>
              )}

              {/* Sekce: Oblíbené */}
              {activeTab === 'favorites' && (
                <div className="space-y-6 fade-in-up">
                  {loadingProducts || favoritesLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary/40 mb-4" />
                      <p className="text-primary/60">Načítám oblíbené produkty...</p>
                    </div>
                  ) : favoriteProducts.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6">
                        <Heart className="w-10 h-10 text-primary/40" />
                      </div>
                      <h3 className="text-2xl font-serif text-primary mb-2">Seznam přání je prázdný</h3>
                      <p className="text-primary/60 max-w-md mx-auto">
                        Označte si produkty srdíčkem, abyste je zde našli.
                      </p>
                      <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-accent text-white rounded-full hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
                        Jít nakupovat
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-primary/10 p-8">
                      <h2 className="text-2xl font-serif font-semibold text-primary mb-6">
                        Oblíbené produkty ({favoriteProducts.length})
                      </h2>
                      <div className="space-y-4">
                        {favoriteProducts.map((product, index) => (
                          <div 
                            key={product.id} 
                            className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-background/30 to-background/10 border border-primary/10 hover:border-accent/30 transition-all duration-300"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <Link
                              to={`/produkt/${product.handle}`}
                              className="flex items-center space-x-4 flex-1 min-w-0"
                            >
                              <div className="relative flex-shrink-0">
                                <img
                                  src={product.image || '/placeholder.jpg'}
                                  alt={product.title}
                                  className="w-20 h-20 object-cover rounded-lg shadow-sm"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-primary truncate mb-1">
                                  {product.title}
                                </h3>
                                <p className="text-sm font-semibold text-accent">
                                  {product.price}
                                </p>
                              </div>
                            </Link>
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={(e) => handleAddToCart(product, e)}
                                disabled={addingToCart === product.id || !product.variantId}
                                className="h-8 px-3 rounded-lg border border-primary/20 hover:bg-accent/10 hover:border-accent disabled:opacity-50 transition-colors flex items-center justify-center"
                              >
                                {addingToCart === product.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ShoppingCart className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRemoveFavorite(product.id)}
                                disabled={favoritesLoading}
                                className="h-8 px-3 rounded-lg text-primary/60 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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