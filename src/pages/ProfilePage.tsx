import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Mail, UserCheck } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()

  // Show loading only during initial auth check and only if we have no user at all
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám...</div>
      </div>
    )
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

  // If user exists but no profile, show a fallback with user's basic info
  const displayData = profile || {
    email: user.email || 'Neznámý email',
    first_name: user.user_metadata?.first_name || 'Neznámé',
    last_name: user.user_metadata?.last_name || 'jméno',
    gender: user.user_metadata?.gender || 'other',
    newsletter_consent: user.user_metadata?.newsletter_consent || false,
    role: 'user'
  }

  const formatGender = (gender: string) => {
    const genderMap = {
      'male': 'Muž',
      'female': 'Žena',
      'other': 'Jiné'
    }
    return genderMap[gender as keyof typeof genderMap] || gender
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-foreground mb-2">Váš profil</h1>
            <p className="text-muted-foreground">Spravujte své osobní údaje</p>
          </div>


          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-medium">
                <User className="h-5 w-5 text-primary" />
                Osobní údaje
              </CardTitle>
              <CardDescription>
                Detaily vašeho účtu a předvolby
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Celé jméno</label>
                  <p className="text-lg font-light text-foreground">
                    {displayData.first_name} {displayData.last_name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emailová adresa
                </label>
                <p className="text-lg font-light text-foreground">{displayData.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Pohlaví
                </label>
                <Badge variant="secondary" className="text-sm font-light">
                  {formatGender(displayData.gender)}
                </Badge>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}