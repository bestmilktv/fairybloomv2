import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User } from 'lucide-react'

interface CompleteProfileModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function CompleteProfileModal({ isOpen, onComplete }: CompleteProfileModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateProfile, refreshUser } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError('Prosím vyplňte jméno i příjmení.')
      setLoading(false)
      return
    }

    try {
      const result = await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
      if (!result.success) {
        setError(result.error || 'Aktualizace profilu se nezdařila.')
      } else {
        // Refresh user data
        await refreshUser()
        
        toast({
          title: "Profil aktualizován",
          description: "Vaše údaje byly úspěšně uloženy.",
        })
        onComplete()
      }
    } catch (error) {
      setError('Nastala neočekávaná chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Doplnění údajů</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-gold/10 rounded-full">
                <User className="h-8 w-8 text-gold" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Pro dokončení registrace prosím vyplňte své jméno a příjmení.
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
