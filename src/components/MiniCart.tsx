import React, { useState } from 'react'
import { X, Plus, Minus, ShoppingBag, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

interface MiniCartProps {
  isOpen: boolean
  onClose: () => void
}

export function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { items, cartId, isLoading, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, clearCart, refreshCart } = useCart()
  const { toast } = useToast()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('cs-CZ')} Kč`
  }

  // Handle checkout with Shopify
  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOut || !cartId) return

    try {
      setIsCheckingOut(true)

      // Get checkout URL for cart
      const { getCheckoutUrl } = await import('@/lib/shopify')
      const checkoutUrl = await getCheckoutUrl(cartId)
      
      if (!checkoutUrl) {
        throw new Error('Checkout URL not available')
      }
      
      // Show success message
      toast({
        title: "Přesměrování k pokladně",
        description: "Váš košík byl připraven. Přesměrováváme vás k pokladně...",
      })

      // Close sidebar
      onClose()

      // Redirect to checkout
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Error during checkout:', error)
      
      // Handle specific error cases
      if (error.message.includes('not found') || error.message.includes('expired')) {
        // Clear invalid cart and ask user to try again
        localStorage.removeItem('fairybloom-cart-id')
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh'
        }}
        onClick={onClose}
      />
      
      {/* Cart Sidebar Panel - 20-25% width */}
      <div className={`fixed top-0 right-0 h-screen w-96 min-w-[400px] max-w-[500px] bg-background border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ position: 'fixed', top: 0, right: 0, height: '100vh' }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-background to-primary/5">
            <h2 className="text-xl font-serif font-semibold text-luxury">
              Košík ({getTotalItems()})
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center py-12 fade-in-up">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-60" />
                <h3 className="text-lg font-medium text-luxury mb-2">Váš košík je prázdný</h3>
                <p className="text-muted-foreground mb-6">Přidejte si nějaké krásné šperky</p>
                <Button onClick={onClose} variant="outline" className="hover:bg-gold/10 hover:border-gold">
                  Pokračovat v nákupu
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50 hover:border-gold/30 transition-all duration-300 fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg shadow-sm"
                      />
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatPrice(item.price)} / ks
                      </p>
                      <p className="text-sm font-semibold text-gold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0 hover:bg-gold/10 hover:border-gold disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0 hover:bg-gold/10 hover:border-gold disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-destructive transition-colors duration-200 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Total and Checkout */}
          {items.length > 0 && (
            <div className="border-t border-border p-6 space-y-4 bg-gradient-to-r from-background to-primary/5">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Celkem:</span>
                <span className="text-2xl font-serif font-bold text-gold">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut || isLoading || !cartId || items.length === 0}
                  variant="luxury" 
                  className="w-full h-12 text-lg font-medium"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Připravuji pokladnu...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Jít k pokladně
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut || isLoading || !cartId}
                  variant="outline" 
                  className="w-full h-10 hover:bg-gold/10 hover:border-gold disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Připravuji...
                    </>
                  ) : (
                    "Zobrazit detail košíku"
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Bezpečné platby přes Shopify
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}