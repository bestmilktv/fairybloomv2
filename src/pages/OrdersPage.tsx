import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Calendar, CreditCard, ShoppingBag } from 'lucide-react'

export default function OrdersPage() {
  const { user, loading } = useAuth()

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
              Moje objednávky
            </h1>
            <p className="text-muted-foreground">
              Sledujte stav svých objednávek
            </p>
          </div>

          {/* Shopify Integration Notice */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Shopify Integrace
              </CardTitle>
              <CardDescription>
                Objednávky jsou nyní spravovány přes Shopify
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Objednávky</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Všechny objednávky jsou nyní zpracovávány přes Shopify checkout systém.
                  Pro sledování objednávek zkontrolujte svůj e-mail nebo se přihlaste do Shopify účtu.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Objednávky se zpracovávají automaticky</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Stav objednávek najdete v e-mailu</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Platby jsou bezpečně zpracovávány Shopify</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Žádné objednávky
              </h3>
              <p className="text-muted-foreground mb-6">
                Zatím jste neprovedli žádné objednávky. Prohlédněte si naše produkty a vytvořte svou první objednávku.
              </p>
              <a 
                href="/" 
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Prohlédnout produkty
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}