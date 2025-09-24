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
  const [errors, setErrors] = useState<string[]>([])
  const { login, register } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    address1: '',
    city: '',
    zip: '',
    country: 'CZ',
    newsletterConsent: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      if (mode === 'login') {
        const result = await login(formData.email, formData.password)
        if (!result.success) {
          setErrors([result.error || 'Přihlášení se nezdařilo'])
        } else {
          toast({
            title: "Přihlášení",
            description: "Úspěšně jste se přihlásili.",
          })
          onClose()
        }
      } else {
        // Validate password confirmation
        if (formData.password !== formData.confirmPassword) {
          setErrors(['Hesla se neshodují.'])
          return
        }

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || 
            !formData.address1 || !formData.city || !formData.zip || !formData.country) {
          setErrors(['Všechna pole jsou povinná.'])
          return
        }

        const result = await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          passwordConfirmation: formData.confirmPassword,
          acceptsMarketing: formData.newsletterConsent,
          address: {
            address1: formData.address1,
            city: formData.city,
            zip: formData.zip,
            country: formData.country
          }
        })

        if (!result.success) {
          setErrors([result.error || 'Registrace se nezdařila'])
        } else {
          toast({
            title: "Registrace",
            description: "Účet byl vytvořen a jste přihlášeni.",
          })
          onClose()
        }
      }
    } catch (error) {
      setErrors(['Nastala neočekávaná chyba.'])
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
                <Label htmlFor="address1">Ulice a číslo popisné</Label>
                <Input
                  id="address1"
                  type="text"
                  value={formData.address1}
                  onChange={(e) => handleInputChange('address1', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Město</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">PSČ</Label>
                  <Input
                    id="zip"
                    type="text"
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Země</Label>
                <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZ">Česká republika</SelectItem>
                    <SelectItem value="SK">Slovensko</SelectItem>
                    <SelectItem value="DE">Německo</SelectItem>
                    <SelectItem value="AT">Rakousko</SelectItem>
                    <SelectItem value="PL">Polsko</SelectItem>
                    <SelectItem value="HU">Maďarsko</SelectItem>
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

          {errors.length > 0 && (
            <div className="text-red-600 text-sm space-y-1">
              {errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Načítám...' : (mode === 'login' ? 'Přihlásit se' : 'Registrovat se')}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setErrors([])
            }}
            className="text-sm"
          >
            {mode === 'login' 
              ? 'Nemáte účet? Zaregistrujte se' 
              : 'Máte účet? Přihlaste se'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}