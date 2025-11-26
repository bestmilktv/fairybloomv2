import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { COUNTRIES, getCountryByCode } from '@/lib/countries'
import { Loader2, User } from 'lucide-react'

interface CompleteProfileModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function CompleteProfileModal({ isOpen, onComplete }: CompleteProfileModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('CZ')
  const [phone, setPhone] = useState('')
  const [acceptsMarketing, setAcceptsMarketing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateProfile, refreshUser, user } = useAuth()
  const { toast } = useToast()

  // Check if user already has all required data - modal cannot be closed if data is missing
  const hasAllData = user?.firstName && user?.lastName && user?.address?.address1 && user?.address?.city && user?.address?.zip && user?.address?.country
  const canClose = hasAllData

  // Pre-fill form with existing user data when modal opens or user data changes
  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setAddress1(user.address?.address1 || '')
      setAddress2(user.address?.address2 || '')
      setCity(user.address?.city || '')
      setZip(user.address?.zip || '')
      setCountry(user.address?.country || 'CZ')
      setPhone(user.address?.phone || '')
      // Always default to true for newsletter - checkbox should be checked by default
      setAcceptsMarketing(true)
    } else if (isOpen) {
      // Reset form when modal opens for new user
      setFirstName('')
      setLastName('')
      setAddress1('')
      setAddress2('')
      setCity('')
      setZip('CZ')
      setCountry('CZ')
      setPhone('')
      // Always default to true for newsletter
      setAcceptsMarketing(true)
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate all required fields
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prosím vyplňte jméno i příjmení.')
      setLoading(false)
      return
    }

    if (!address1.trim() || !city.trim() || !zip.trim() || !country.trim()) {
      setError('Prosím vyplňte všechny povinné údaje o adrese.')
      setLoading(false)
      return
    }

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
        setError(result.error || 'Aktualizace profilu se nezdařila.')
      } else {
        // Also save to Supabase as backup
        try {
          const supabaseResponse = await fetch('/api/customer/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              address1: addressData.address1,
              address2: addressData.address2,
              city: addressData.city,
              province: addressData.province,
              zip: addressData.zip,
              country: addressData.country,
              phone: addressData.phone,
              acceptsMarketing
            })
          })

          if (supabaseResponse.ok) {
            console.log('[CompleteProfileModal] Successfully saved to Supabase')
          } else {
            console.warn('[CompleteProfileModal] Failed to save to Supabase, but Shopify save succeeded')
          }
        } catch (supabaseError) {
          console.warn('[CompleteProfileModal] Error saving to Supabase:', supabaseError)
          // Don't fail the whole operation if Supabase save fails
        }

        // Wait a bit for Shopify to process the update
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Refresh user data from Shopify to ensure we have the latest data
        // Skip modal check since profile is now complete
        await refreshUser(true, false)
        
        // Wait again to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 300))
        
        toast({
          title: "Profil aktualizován",
          description: "Vaše údaje byly úspěšně uloženy.",
        })
        
        // Reset justLoggedIn flag after completing profile
        // This ensures modal won't show again unless user logs in again
        onComplete()
      }
    } catch (error) {
      setError('Nastala neočekávaná chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if user has name filled
        if (!open && canClose) {
          onComplete()
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        // Prevent closing by clicking outside if name is missing
        if (!canClose) {
          e.preventDefault()
        }
      }} onEscapeKeyDown={(e) => {
        // Prevent closing with Escape if name is missing
        if (!canClose) {
          e.preventDefault()
        }
      }}>
        <DialogHeader>
          <DialogTitle>Doplnění údajů</DialogTitle>
          <DialogDescription>
            Pro dokončení registrace prosím vyplňte své údaje a adresu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-gold/10 rounded-full">
                <User className="h-8 w-8 text-gold" />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Jméno *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Vaše jméno"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Příjmení *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Vaše příjmení"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Ulice a číslo popisné *</Label>
              <Input
                id="address1"
                type="text"
                placeholder="Např. Hlavní 123"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address2">Doplňující údaje (volitelné)</Label>
              <Input
                id="address2"
                type="text"
                placeholder="Např. byt 5"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Město *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Např. Praha"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">PSČ *</Label>
                <Input
                  id="zip"
                  type="text"
                  placeholder="Např. 12000"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Země *</Label>
                <Select
                  value={country}
                  onValueChange={setCountry}
                  disabled={loading}
                  required
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Vyberte zemi">
                      {country ? (getCountryByCode(country)?.name || country) : 'Vyberte zemi'}
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

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (volitelné)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Např. +420 123 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptsMarketing"
                  checked={acceptsMarketing}
                  onCheckedChange={(checked) => setAcceptsMarketing(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="acceptsMarketing" className="cursor-pointer text-sm">
                  Chci odebírat newsletter a být informován o novinkách a speciálních nabídkách
                </Label>
              </div>
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full" 
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              'Uložit údaje'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
