import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShoppingBag } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { loginWithSSO } = useAuth()
  const { toast } = useToast()

  const handleSSOLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await loginWithSSO()
      if (!result.success) {
        setError(result.error || 'Přihlášení se nezdařilo')
      } else {
        toast({
          title: "Přihlášení",
          description: "Úspěšně jste se přihlásili přes Shopify.",
        })
        onClose()
      }
    } catch (error) {
      setError('Nastala neočekávaná chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Přihlášení</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-gold/10 rounded-full">
                <ShoppingBag className="h-8 w-8 text-gold" />
              </div>
            </div>
            <h3 className="text-lg font-medium">Přihlášení přes Shopify</h3>
            <p className="text-sm text-muted-foreground">
              Přihlaste se bezpečně pomocí svého Shopify účtu
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button 
            onClick={handleSSOLogin} 
            className="w-full" 
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Přihlašuji...
              </>
            ) : (
              'Přihlásit se přes Shopify'
            )}
          </Button>

          <div className="text-xs text-center text-muted-foreground">
            Kliknutím na tlačítko se otevře nové okno pro bezpečné přihlášení.
            <br />
            Pokud máte blokované popup okna, povolte je pro tento web.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}