import React, { useState, useEffect } from 'react'
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
  const { signIn, signUp, user, session, loading: authLoading, profile } = useAuth()
  const { toast } = useToast()

  // Simple auto-close logic - close immediately when user is authenticated
  useEffect(() => {
    // Close modal when user and session are present
    if (user && session && isOpen) {
      console.log('AuthModal: User authenticated, closing modal')
      setLoading(false)
      onClose()
    }
  }, [user, session, isOpen, onClose])

  // Reset loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false)
    }
  }, [isOpen])

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  // Registration form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    gender: undefined as 'male' | 'female' | 'other' | undefined,
    email: '',
    password: '',
    confirmPassword: '',
    newsletterConsent: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {}

    if (!loginData.email.trim()) newErrors.email = 'Email je povinný'
    else if (!/\S+@\S+\.\S+/.test(loginData.email)) newErrors.email = 'Neplatný formát emailu'
    
    if (!loginData.password) newErrors.password = 'Heslo je povinné'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateRegisterForm = () => {
    const newErrors: Record<string, string> = {}

    if (!registerData.firstName.trim()) newErrors.firstName = 'Jméno je povinné'
    if (!registerData.lastName.trim()) newErrors.lastName = 'Příjmení je povinné'
    if (!registerData.gender) newErrors.gender = 'Pohlaví je povinné'
    if (!registerData.email.trim()) newErrors.email = 'Email je povinný'
    else if (!/\S+@\S+\.\S+/.test(registerData.email)) newErrors.email = 'Neplatný formát emailu'
    
    if (!registerData.password) newErrors.password = 'Heslo je povinné'
    else if (registerData.password.length < 6) newErrors.password = 'Heslo musí mít alespoň 6 znaků'
    
    if (!registerData.confirmPassword) newErrors.confirmPassword = 'Potvrďte prosím heslo'
    else if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Hesla se neshodují'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLoginForm()) return

    setLoading(true)
    console.log('AuthModal: Starting login process')
    
    const { error } = await signIn(loginData.email, loginData.password)
    
    if (error) {
      console.error('AuthModal: Login error:', error)
      setLoading(false)
      
      // Provide user-friendly error messages in Czech
      let errorMessage = 'Neplatný email nebo heslo'
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Neplatné přihlašovací údaje'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email nebyl potvrzen'
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Příliš mnoho pokusů. Zkuste to později.'
      }
      
      toast({
        variant: "destructive",
        title: "Přihlášení selhalo",
        description: errorMessage
      })
    } else {
      console.log('AuthModal: Login successful')
      toast({
        title: "Vítejte zpět!",
        description: "Byly jste úspěšně přihlášeni."
      })
      // Modal will close automatically via useEffect when auth state is fully updated
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRegisterForm()) return

    setLoading(true)
    console.log('AuthModal: Starting registration process')
    
    const { error } = await signUp({
      email: registerData.email,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      gender: registerData.gender,
      newsletterConsent: registerData.newsletterConsent
    })

    if (error) {
      console.error('AuthModal: Registration error:', error)
      setLoading(false)
      
      // Provide user-friendly error messages in Czech
      let errorMessage = 'Chyba při registraci'
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Uživatel s tímto emailem již existuje'
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Heslo musí mít alespoň 6 znaků'
      } else if (error.message?.includes('Unable to validate email')) {
        errorMessage = 'Neplatný formát emailu'
      }
      
      toast({
        variant: "destructive",
        title: "Registrace selhala",
        description: errorMessage
      })
    } else {
      console.log('AuthModal: Registration successful')
      toast({
        title: "Účet vytvořen!",
        description: "Vítejte v Fairy Bloom!"
      })
      // Modal will close automatically via useEffect when auth state is fully updated
    }
  }

  const resetForm = () => {
    setLoginData({ email: '', password: '' })
    setRegisterData({
      firstName: '',
      lastName: '',
      gender: '' as any,
      email: '',
      password: '',
      confirmPassword: '',
      newsletterConsent: true
    })
    setErrors({})
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-gold/20">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-light text-luxury tracking-wide">
            {mode === 'login' ? 'Přihlášení' : 'Registrace'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-foreground/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  className={`mt-1 bg-background/50 border-gold/20 focus:border-gold ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-foreground/80">Heslo</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    className={`mt-1 bg-background/50 border-gold/20 focus:border-gold pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1 h-9 w-9 text-foreground/60 hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold/80 to-gold text-background hover:from-gold hover:to-gold/90 transition-all duration-300"
            >
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => switchMode('register')}
                className="text-foreground/60 hover:text-gold"
              >
                Nemáte účet? Zaregistrujte se
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-foreground/80">Jméno</Label>
                  <Input
                    id="firstName"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`mt-1 bg-background/50 border-gold/20 focus:border-gold ${errors.firstName ? 'border-destructive' : ''}`}
                    placeholder="Jméno"
                  />
                  {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-foreground/80">Příjmení</Label>
                  <Input
                    id="lastName"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`mt-1 bg-background/50 border-gold/20 focus:border-gold ${errors.lastName ? 'border-destructive' : ''}`}
                    placeholder="Příjmení"
                  />
                  {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="gender" className="text-foreground/80">Pohlaví</Label>
                <Select value={registerData.gender} onValueChange={(value: 'male' | 'female' | 'other') => 
                  setRegisterData(prev => ({ ...prev, gender: value }))
                }>
                  <SelectTrigger className={`mt-1 bg-background/50 border-gold/20 focus:border-gold ${errors.gender ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder="Vyberte pohlaví" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-gold/20">
                    <SelectItem value="male">Muž</SelectItem>
                    <SelectItem value="female">Žena</SelectItem>
                    <SelectItem value="other">Jiné</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
              </div>

              <div>
                <Label htmlFor="registerEmail" className="text-foreground/80">Email</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  className={`mt-1 bg-background/50 border-gold/20 focus:border-gold ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="registerPassword" className="text-foreground/80">Heslo</Label>
                <div className="relative">
                  <Input
                    id="registerPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    className={`mt-1 bg-background/50 border-gold/20 focus:border-gold pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1 h-9 w-9 text-foreground/60 hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-foreground/80">Potvrdit heslo</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`mt-1 bg-background/50 border-gold/20 focus:border-gold pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1 h-9 w-9 text-foreground/60 hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletterConsent"
                  checked={registerData.newsletterConsent}
                  onCheckedChange={(checked) => 
                    setRegisterData(prev => ({ ...prev, newsletterConsent: checked as boolean }))
                  }
                  className="border-gold/40 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                />
                <Label htmlFor="newsletterConsent" className="text-sm text-foreground/70">
                  Chci dostávat newsletter
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold/80 to-gold text-background hover:from-gold hover:to-gold/90 transition-all duration-300"
            >
              {loading ? 'Registrování...' : 'Zaregistrovat se'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => switchMode('login')}
                className="text-foreground/60 hover:text-gold"
              >
                Už máte účet? Přihlaste se
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}