import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Package } from 'lucide-react'

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
              Mé objednávky
            </h1>
            <p className="text-muted-foreground">
              Sledujte stav svých objednávek
            </p>
          </div>

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