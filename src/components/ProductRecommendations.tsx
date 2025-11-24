import React, { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { getProductsByCollection } from '@/lib/shopify'
import { createCollectionHandle, createProductPath } from '@/lib/slugify'

// Import product images for fallback
import necklaceImage from '@/assets/necklace-placeholder.jpg'
import earringsImage from '@/assets/earrings-placeholder.jpg'
import ringImage from '@/assets/ring-placeholder.jpg'
import braceletImage from '@/assets/bracelet-placeholder.jpg'

interface Product {
  id: string
  title: string
  price: string
  image: string
  category: string
  handle?: string
  variantId?: string
  createdAt?: string
}

interface ProductRecommendationsProps {
  currentProductId: string
  currentCategory: string
}

export function ProductRecommendations({ currentProductId, currentCategory }: ProductRecommendationsProps) {
  const { addToCart, items } = useCart()
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Sledování produktů přidaných z této sekce - ty zůstanou viditelné i když jsou v košíku
  const [addedFromThisSection, setAddedFromThisSection] = useState<Set<string>>(new Set())

  // Collection mapping for Shopify - using slugified handles
  const collectionMapping = {
    'Náhrdelníky': 'nahrdelniky',  // Actual Shopify handle (slugified)
    'Náušnice': 'nausnice',        // Actual Shopify handle (slugified)
    'Prsteny': 'prsteny',          // Actual Shopify handle (no diacritics)
    'Náramky': 'naramky'           // Actual Shopify handle (slugified)
  }

  // Helper function to get fallback image
  const getFallbackImage = (category: string) => {
    switch (category) {
      case 'Náhrdelníky': return necklaceImage;
      case 'Náušnice': return earringsImage;
      case 'Prsteny': return ringImage;
      case 'Náramky': return braceletImage;
      default: return necklaceImage;
    }
  }

  // Fetch recommendations from Shopify
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true)
        
        // Get all collections
        const collections = Object.values(collectionMapping)
        const allProducts: Product[] = []

        // Fetch products from each collection
        for (const collectionHandle of collections) {
          try {
            const collection = await getProductsByCollection(collectionHandle, 5)
            
            if (collection && collection.products?.edges) {
              const products = collection.products.edges.map(edge => {
                const product = edge.node
                const firstImage = product.images?.edges?.[0]?.node
                const firstVariant = product.variants?.edges?.[0]?.node
                
                // Map collection handle back to Czech category name
                const czechCategory = Object.keys(collectionMapping).find(
                  key => collectionMapping[key as keyof typeof collectionMapping] === collectionHandle
                ) || 'Náhrdelníky'
                
                return {
                  id: product.id,
                  title: product.title,
                  price: firstVariant?.price ? 
                    `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}` : 
                    'Cena na vyžádání',
                  image: firstImage?.url || getFallbackImage(czechCategory),
                  category: czechCategory,
                  handle: product.handle,
                  variantId: firstVariant?.id,
                  createdAt: product.createdAt
                }
              })
              
              allProducts.push(...products)
            }
          } catch (error) {
            console.error(`Error fetching ${collectionHandle}:`, error)
          }
        }

        // Get cart item IDs to exclude products already in cart
        const cartItemIds = new Set(items.map(item => item.id))
        
        // Filter out current product and products already in cart
        // ALE ponecháme produkty, které byly přidány z této sekce
        const filteredProducts = allProducts.filter(p => 
          p.id !== currentProductId && (!cartItemIds.has(p.id) || addedFromThisSection.has(p.id))
        )
        
        const sameCategory = filteredProducts.filter(p => p.category === currentCategory)
        const otherCategories = filteredProducts.filter(p => p.category !== currentCategory)
        
        // Build final recommendations:
        // 1. First 2 products from same category (most popular - first in collection order)
        // 2. Newest product from same category (by createdAt) as 3rd position
        // 3. If not enough products in same category, fill from other categories
        const finalRecommendations: Product[] = []
        
        // Get first 2 most popular products from same category
        const mostPopular = sameCategory.slice(0, 2)
        finalRecommendations.push(...mostPopular)
        
        // Get newest product from same category (excluding already selected ones)
        const selectedIds = new Set(mostPopular.map(p => p.id))
        const remainingInCategory = sameCategory.filter(p => !selectedIds.has(p.id))
        
        if (remainingInCategory.length > 0) {
          // Sort by createdAt descending (newest first) and take the first one
          const newestInCategory = remainingInCategory
            .sort((a, b) => {
              const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
              const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
              return bDate - aDate // Descending order (newest first)
            })
            .slice(0, 1)
          
          if (newestInCategory.length > 0) {
            finalRecommendations.push(newestInCategory[0])
          }
        }
        
        // If we still don't have 3 products, fill from other categories
        if (finalRecommendations.length < 3) {
          const remaining = otherCategories.slice(0, 3 - finalRecommendations.length)
          finalRecommendations.push(...remaining)
        }
        
        // Ensure we have exactly 3 products (or less if not available)
        setRecommendations(finalRecommendations.slice(0, 3))
      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setRecommendations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [currentProductId, currentCategory, items, addedFromThisSection])

  const handleAddToCart = async (product: Product, event: React.MouseEvent) => {
    event.preventDefault() // Prevent Link navigation
    
    // Check if product is already in cart
    const isInCart = items.some(item => item.id === product.id);
    if (isInCart) return;
    
    try {
      const priceNumber = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'))
      
      await addToCart({
        id: product.id,
        name: product.title,
        price: priceNumber,
        image: product.image,
        category: product.category,
        variantId: product.variantId,
        isShopifyProduct: !!product.variantId, // True if we have a variant ID
      })
      
      // Označíme produkt jako přidaný z této sekce, aby zůstal viditelný
      setAddedFromThisSection(prev => new Set(prev).add(product.id))
      
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
    }
  }

  if (isLoading) {
    return (
      <div className="mt-16 pt-16 pb-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-serif font-bold text-luxury mb-8 text-center">
            Mohlo by se vám líbit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted rounded-2xl h-96 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <div className="mt-16 pt-16 pb-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-serif font-bold text-luxury mb-8 text-center">
          Mohlo by se vám líbit
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recommendations.map((product) => (
            <Link
              key={product.id}
              to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`}
              className="group block"
            >
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-2 h-full flex flex-col">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                
                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-serif text-xl font-semibold text-luxury mb-4 group-hover:text-gold transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-2xl font-semibold text-gold font-serif">
                      {product.price}
                    </span>
                    <Button 
                      variant="gold" 
                      size="sm"
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={items.some(item => item.id === product.id)}
                      className={items.some(item => item.id === product.id) ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {items.some(item => item.id === product.id) ? 'Přidáno do košíku' : 'Přidat do košíku'}
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}