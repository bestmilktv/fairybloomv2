import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'register'
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    gender: 'other' as 'male' | 'female' | 'other',
    newsletterConsent: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(formData.email, formData.password)
        if (error) {
          toast({
            title: "Chyba při přihlášení",
            description: "Přihlášení není momentálně k dispozici.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Přihlášení",
            description: "Přihlášení není momentálně k dispozici.",
          })
          onClose()
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Chyba",
            description: "Hesla se neshodují.",
            variant: "destructive",
          })
          return
        }

        const { error } = await signUp({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender,
          newsletterConsent: formData.newsletterConsent
        })

        if (error) {
          toast({
            title: "Chyba při registraci",
            description: "Registrace není momentálně k dispozici.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Registrace",
            description: "Registrace není momentálně k dispozici.",
          })
          onClose()
        }
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Přihlášení' : 'Registrace'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Jméno</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Příjmení</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gender">Pohlaví</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Muž</SelectItem>
                    <SelectItem value="female">Žena</SelectItem>
                    <SelectItem value="other">Jiné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Heslo</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <Label htmlFor="confirmPassword">Potvrdit heslo</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletterConsent}
                  onCheckedChange={(checked) => handleInputChange('newsletterConsent', checked)}
                />
                <Label htmlFor="newsletter" className="text-sm">
                  Chci dostávat newsletter s novinkami a nabídkami
                </Label>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Načítám...' : (mode === 'login' ? 'Přihlásit se' : 'Registrovat se')}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-sm"
          >
            {mode === 'login' 
              ? 'Nemáte účet? Zaregistrujte se' 
              : 'Máte účet? Přihlaste se'
            }
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Autentizace není momentálně k dispozici.</p>
          <p>E-shop funguje bez registrace.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}