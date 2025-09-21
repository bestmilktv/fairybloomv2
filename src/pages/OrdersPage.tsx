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

  // Mock orders data - in a real app, this would come from your database
  const orders = []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-foreground mb-2">Moje objednávky</h1>
            <p className="text-muted-foreground">Sledujte a zobrazte historii svých objednávek</p>
          </div>

          {orders.length === 0 ? (
            <Card className="shadow-sm border-border/50">
              <CardContent className="py-16">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium text-foreground">Zatím nemáte žádné objednávky</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Zatím nemáte žádné objednávky. Začněte nakupovat a uvidíte je zde.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="shadow-sm border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg font-medium">
                        <Package className="h-5 w-5 text-primary" />
                        Order #{order.orderNumber}
                      </CardTitle>
                      <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {order.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        {order.total}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                          <span className="font-light text-foreground">{item.name}</span>
                          <span className="text-muted-foreground">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}