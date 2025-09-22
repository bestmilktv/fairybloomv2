import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Základní informace
                </CardTitle>
                <CardDescription>
                  Vaše osobní údaje
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.email || 'Není k dispozici'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Stav účtu</p>
                    <p className="text-sm text-muted-foreground">
                      {user ? 'Aktivní' : 'Neaktivní'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Nastavení účtu</CardTitle>
                <CardDescription>
                  Spravujte své předvolby
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Shopify Integrace</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Všechny produkty a objednávky jsou nyní spravovány přes Shopify.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Nastavení není k dispozici
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>O aplikaci</CardTitle>
              <CardDescription>
                Informace o Fairy Bloom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">E-shop</h3>
                  <p className="text-sm text-muted-foreground">
                    Fairy Bloom je e-shop s ručně vyráběnými šperky s květinami zachycenými v čase.
                    Všechny produkty jsou spravovány přes Shopify platformu.
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Kontakt</h3>
                  <p className="text-sm text-muted-foreground">
                    Pro jakékoliv dotazy nebo podporu nás kontaktujte přes kontaktní formulář.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}