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
}

interface ProductRecommendationsProps {
  currentProductId: string
  currentCategory: string
}

export function ProductRecommendations({ currentProductId, currentCategory }: ProductRecommendationsProps) {
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
                  variantId: firstVariant?.id
                }
              })
              
              allProducts.push(...products)
            }
          } catch (error) {
            console.error(`Error fetching ${collectionHandle}:`, error)
          }
        }

        // Filter out current product and get recommendations
        const filteredProducts = allProducts.filter(p => p.id !== currentProductId)
        const sameCategory = filteredProducts.filter(p => p.category === currentCategory)
        const otherCategories = filteredProducts.filter(p => p.category !== currentCategory)
        
        const finalRecommendations = [...sameCategory, ...otherCategories].slice(0, 3)
        setRecommendations(finalRecommendations)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setRecommendations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [currentProductId, currentCategory])

  const handleAddToCart = async (product: Product, event: React.MouseEvent) => {
    event.preventDefault() // Prevent Link navigation
    
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
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 transform group-hover:-translate-y-2">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold text-luxury mb-2 group-hover:text-gold transition-colors duration-300">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-gold font-serif">
                      {product.price}
                    </span>
                    <Button 
                      variant="premium" 
                      size="sm"
                      onClick={(e) => handleAddToCart(product, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      Přidat do košíku
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