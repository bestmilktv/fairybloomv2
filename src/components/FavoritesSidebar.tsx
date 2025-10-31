import React, { useState, useEffect } from 'react'
import { X, Heart, Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { getProductById } from '@/lib/shopify'

interface FavoritesSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface FavoriteProduct {
  id: string
  title: string
  handle: string
  image: string
  price: string
  variantId?: string
}

export function FavoritesSidebar({ isOpen, onClose }: FavoritesSidebarProps) {
  const { favorites, removeFromFavorites, isLoading: favoritesLoading } = useFavorites()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Fetch product details for favorite IDs
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteProducts([])
      return
    }

    const fetchFavoriteProducts = async () => {
      setLoadingProducts(true)
      try {
        const products = await Promise.all(
          favorites.map(async (productId) => {
            try {
              const product = await getProductById(productId)
              if (!product) return null

              const firstImage = product.images?.edges?.[0]?.node
              const firstVariant = product.variants?.edges?.[0]?.node

              return {
                id: product.id,
                title: product.title,
                handle: product.handle,
                image: firstImage?.url || '',
                price: firstVariant?.price
                  ? `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}`
                  : 'Cena na vyžádání',
                variantId: firstVariant?.id,
              }
            } catch (error) {
              console.error(`Error fetching product ${productId}:`, error)
              return null
            }
          })
        )

        setFavoriteProducts(products.filter((p): p is FavoriteProduct => p !== null))
      } catch (error) {
        console.error('Error fetching favorite products:', error)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchFavoriteProducts()
  }, [favorites])

  const formatPrice = (price: string) => {
    return price
  }

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFromFavorites(productId)
      toast({
        title: "Odebráno z oblíbených",
        description: "Produkt byl odebrán z vašich oblíbených.",
      })
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast({
        title: "Chyba",
        description: "Nepodařilo se odebrat produkt z oblíbených.",
        variant: "destructive",
      })
    }
  }

  const handleAddToCart = async (product: FavoriteProduct, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!product.variantId) {
      toast({
        title: "Chyba",
        description: "Produkt nemá dostupné varianty.",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingToCart(product.id)
      const priceNumber = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0

      await addToCart({
        id: product.id,
        name: product.title,
        price: priceNumber,
        image: product.image,
        category: 'Shopify Product',
        variantId: product.variantId,
        isShopifyProduct: true,
      })

      toast({
        title: "Přidáno do košíku",
        description: `${product.title} byl přidán do vašeho košíku.`,
      })
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Chyba při přidávání do košíku",
        description: "Nepodařilo se přidat produkt do košíku. Zkuste to prosím znovu.",
        variant: "destructive",
      })
    } finally {
      setAddingToCart(null)
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
      
      {/* Favorites Sidebar Panel - Left side */}
      <div className={`fixed top-0 left-0 h-screen w-96 min-w-[400px] max-w-[500px] bg-background border-r border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-background to-primary/5">
            <h2 className="text-xl font-serif font-semibold text-luxury">
              Oblíbené ({favorites.length})
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

          {/* Favorites Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingProducts || favoritesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : favoriteProducts.length === 0 ? (
              <div className="text-center py-12 fade-in-up">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-60" />
                <h3 className="text-lg font-medium text-luxury mb-2">Ještě jste si neoblíbili žádný produkt</h3>
                <p className="text-muted-foreground mb-6">Oblíbené produkty si můžete uložit pro pozdější nákup</p>
                <Button onClick={onClose} variant="outline" className="hover:bg-gold/10 hover:border-gold">
                  Prohlédnout produkty
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50 hover:border-gold/30 transition-all duration-300 fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Link
                      to={`/product-shopify/${product.handle}`}
                      onClick={onClose}
                      className="flex items-center space-x-4 flex-1 min-w-0"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={product.image || '/placeholder.jpg'}
                          alt={product.title}
                          className="w-20 h-20 object-cover rounded-lg shadow-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate mb-1">
                          {product.title}
                        </h3>
                        <p className="text-sm font-semibold text-gold">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </Link>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product.id || !product.variantId}
                        className="h-8 px-3 hover:bg-gold/10 hover:border-gold disabled:opacity-50"
                      >
                        {addingToCart === product.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFavorite(product.id)}
                        disabled={favoritesLoading}
                        className="h-8 px-3 text-muted-foreground hover:text-destructive transition-colors duration-200 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {favoriteProducts.length > 0 && (
            <div className="border-t border-border p-6 bg-gradient-to-r from-background to-primary/5">
              <p className="text-xs text-muted-foreground text-center">
                {favoriteProducts.length} {favoriteProducts.length === 1 ? 'oblíbený produkt' : 'oblíbených produktů'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

