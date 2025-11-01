import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading, updateProfile, refreshUser } = useAuth()
  const { toast } = useToast()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('CZ')
  const [phone, setPhone] = useState('')
  const [acceptsMarketing, setAcceptsMarketing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Show loading only during initial auth check and only if we have no user at all
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám...</div>
      </div>
    )
  }

  // Load user data into form when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setAddress1(user.address?.address1 || '')
      setAddress2(user.address?.address2 || '')
      setCity(user.address?.city || '')
      setZip(user.address?.zip || '')
      setCountry(user.address?.country || 'CZ')
      setPhone(user.address?.phone || '')
      setAcceptsMarketing(user.acceptsMarketing || false)
    }
  }, [user])

  // Refresh user data when component mounts if user exists but data might be incomplete
  useEffect(() => {
    const refreshIfNeeded = async () => {
      if (user && (!user.email || !user.address)) {
        // User exists but data seems incomplete, refresh from API
        await refreshUser()
      }
    }
    
    if (!loading && user) {
      refreshIfNeeded()
    }
  }, [user, loading, refreshUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const addressData = {
        address1: address1.trim(),
        address2: address2.trim() || undefined,
        city: city.trim(),
        province: '',
        zip: zip.trim(),
        country: country.trim() || 'CZ',
        phone: phone.trim() || undefined
      }

      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: addressData,
        acceptsMarketing
      })

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || 'Aktualizace profilu se nezdařila.',
          variant: "destructive"
        })
      } else {
        await refreshUser()
        toast({
          title: "Profil aktualizován",
          description: "Vaše údaje byly úspěšně uloženy.",
        })
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: 'Nastala neočekávaná chyba.',
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

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
          <section className="p-6 rounded-lg shadow bg-white mb-6">
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
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-base">{user?.email || 'Nevyplněno'}</p>
              </div>
              {user?.address && (
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
              )}
            </div>
          </section>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="p-6 rounded-lg shadow bg-white">
              <h2 className="text-lg font-semibold mb-6">Základní informace</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Jméno *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Příjmení *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email nelze změnit</p>
                </div>
              </div>
            </section>

            <section className="p-6 rounded-lg shadow bg-white">
              <h2 className="text-lg font-semibold mb-6">Adresa</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address1">Ulice a číslo popisné *</Label>
                  <Input
                    id="address1"
                    type="text"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Doplňující údaje (volitelné)</Label>
                  <Input
                    id="address2"
                    type="text"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Město *</Label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">PSČ *</Label>
                    <Input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Země *</Label>
                    <Input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon (volitelné)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="p-6 rounded-lg shadow bg-white">
              <h2 className="text-lg font-semibold mb-6">Newsletter</h2>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptsMarketing"
                  checked={acceptsMarketing}
                  onCheckedChange={(checked) => setAcceptsMarketing(checked === true)}
                  disabled={isSaving}
                />
                <Label htmlFor="acceptsMarketing" className="cursor-pointer">
                  Chci odebírat newsletter a být informován o novinkách a speciálních nabídkách
                </Label>
              </div>
            </section>

            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={isSaving}
                size="lg"
                className="min-w-[200px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  'Uložit změny'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}