import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

const CartPage = () => {
  const { items, cartId, isLoading, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart()
  const { toast } = useToast()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Handle checkout with Shopify
  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOut) return

    try {
      setIsCheckingOut(true)

      // If no cartId exists, we need to create a cart first
      if (!cartId) {
        toast({
          title: "Chyba",
          description: "Košík není k dispozici. Zkuste to prosím znovu.",
          variant: "destructive",
        })
        return
      }

      // Try to associate authenticated customer with cart
      const { isCustomerAuthenticated } = await import('@/lib/customerAccountApi');
      const isAuth = await isCustomerAuthenticated();
      
      if (isAuth) {
        try {
          // Get access token
          const tokenResponse = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          });

          if (tokenResponse.ok) {
            const { accessToken } = await tokenResponse.json();
            
            // Associate customer with cart
            const { associateCustomerWithCart } = await import('@/lib/shopify');
            await associateCustomerWithCart(cartId, accessToken);
            
            console.log('Customer associated with cart for checkout');
          }
        } catch (error) {
          console.error('Error associating customer with cart:', error);
          // Continue with checkout even if association fails
        }
      }

      // Get checkout URL for cart
      const { getCheckoutUrl } = await import('@/lib/shopify')
      const checkoutUrl = await getCheckoutUrl(cartId)
      
      if (!checkoutUrl) {
        throw new Error('Checkout URL not available')
      }
      
      // Store checkout URL in sessionStorage for later cleanup
      sessionStorage.setItem('fairybloom-checkout-url', checkoutUrl)
      
      // Show success message
      toast({
        title: "Přesměrování k pokladně",
        description: "Váš košík byl připraven. Přesměrováváme vás k pokladně...",
      })

      // Redirect to checkout
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Error during checkout:', error)
      
      // Handle specific error cases
      if (error.message.includes('not found') || error.message.includes('expired')) {
        // Clear invalid cart and ask user to try again
        localStorage.removeItem('fairybloom-cart-id')
        sessionStorage.removeItem('fairybloom-checkout-url')
        await clearCart()
        
        toast({
          title: "Košík vypršel",
          description: "Váš košík vypršel. Zkuste přidat produkty znovu.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Chyba při pokladně",
          description: "Nepodařilo se připravit košík k pokladně. Zkuste to prosím znovu.",
          variant: "destructive",
        })
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gradient-subtle pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-8 bg-muted/20 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.68 8.32M7 13L4.6 5H2" />
                </svg>
              </div>
              <h1 className="text-3xl font-light text-luxury mb-4 tracking-wide">Váš košík je prázdný</h1>
              <p className="text-foreground/60 mb-8 max-w-md mx-auto">
                Prozkoumejte naši kolekci šperků a najděte něco krásného pro sebe
              </p>
              <Link to="/">
                <Button className="bg-primary/90 hover:bg-primary text-primary-foreground px-8 py-3">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Pokračovat v nákupu
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-subtle pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-foreground/60 hover:text-primary transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Pokračovat v nákupu
            </Link>
            <h1 className="text-3xl font-light text-luxury tracking-wide">Nákupní košík</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="glass-card p-6 rounded-lg">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted/20 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-luxury truncate">{item.name}</h3>
                      <p className="text-sm text-foreground/60 mb-3">{item.category}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-muted disabled:opacity-50"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={isLoading}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-muted disabled:opacity-50"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isLoading}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-luxury">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-50"
                            onClick={() => removeFromCart(item.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 rounded-lg sticky top-24">
                <h2 className="text-xl font-light text-luxury mb-6 tracking-wide">Shrnutí objednávky</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-foreground/80">
                    <span>Mezisoučet</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between text-foreground/80">
                    <span>Doprava</span>
                    <span>Zdarma</span>
                  </div>
                  <div className="border-t border-muted pt-4">
                    <div className="flex justify-between text-lg font-medium text-luxury">
                      <span>Celkem</span>
                      <span>{formatPrice(getTotalPrice())}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut || isLoading || !cartId}
                  className="w-full bg-primary/90 hover:bg-primary text-primary-foreground py-3 disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Připravuji pokladnu...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Pokračovat k pokladně
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-foreground/50 text-center mt-4">
                  Bezpečné zpracování platby
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default CartPage