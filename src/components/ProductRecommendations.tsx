import React from 'react'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

// Import product images
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
}

const allProducts: Record<string, Product> = {
  'n1': { id: 'n1', title: 'Růžové okvětí', price: '2 890 Kč', image: necklaceImage, category: 'Náhrdelníky' },
  'n2': { id: 'n2', title: 'Lesní kapradina', price: '3 200 Kč', image: necklaceImage, category: 'Náhrdelníky' },
  'n3': { id: 'n3', title: 'Loučka v létě', price: '2 650 Kč', image: necklaceImage, category: 'Náhrdelníky' },
  'e1': { id: 'e1', title: 'Pomněnkové kapky', price: '1 890 Kč', image: earringsImage, category: 'Náušnice' },
  'e2': { id: 'e2', title: 'Zlaté slunce', price: '2 100 Kč', image: earringsImage, category: 'Náušnice' },
  'e3': { id: 'e3', title: 'Bílá čistota', price: '1 750 Kč', image: earringsImage, category: 'Náušnice' },
  'r1': { id: 'r1', title: 'Věčná láska', price: '3 500 Kč', image: ringImage, category: 'Prsteny' },
  'r2': { id: 'r2', title: 'Přírodní elegance', price: '2 900 Kč', image: ringImage, category: 'Prsteny' },
  'r3': { id: 'r3', title: 'Ranní rosa', price: '3 200 Kč', image: ringImage, category: 'Prsteny' },
  'b1': { id: 'b1', title: 'Zahradní sen', price: '2 400 Kč', image: braceletImage, category: 'Náramky' },
  'b2': { id: 'b2', title: 'Lesní stezka', price: '2 100 Kč', image: braceletImage, category: 'Náramky' },
  'b3': { id: 'b3', title: 'Levandulové pole', price: '2 650 Kč', image: braceletImage, category: 'Náramky' },
}

interface ProductRecommendationsProps {
  currentProductId: string
  currentCategory: string
}

export function ProductRecommendations({ currentProductId, currentCategory }: ProductRecommendationsProps) {
  const { addToCart } = useCart()
  const { toast } = useToast()

  // Get recommendations (same category first, then others, excluding current product)
  const getRecommendations = () => {
    const products = Object.values(allProducts).filter(p => p.id !== currentProductId)
    const sameCategory = products.filter(p => p.category === currentCategory)
    const otherCategories = products.filter(p => p.category !== currentCategory)
    
    const recommendations = [...sameCategory, ...otherCategories].slice(0, 3)
    return recommendations
  }

  const recommendations = getRecommendations()

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault() // Prevent Link navigation
    
    const priceNumber = parseInt(product.price.replace(/[^\d]/g, ''))
    
    addToCart({
      id: product.id,
      name: product.title,
      price: priceNumber,
      image: product.image,
      category: product.category,
    })
    
    toast({
      title: "Přidáno do košíku",
      description: `${product.title} byl přidán do vašeho košíku.`,
    })
  }

  if (recommendations.length === 0) return null

  return (
    <div className="mt-16 pt-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-serif font-bold text-luxury mb-8 text-center">
          Mohlo by se vám líbit
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recommendations.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
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