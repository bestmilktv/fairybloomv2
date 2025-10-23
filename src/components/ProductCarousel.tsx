import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { createProductPath } from '@/lib/slugify';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  handle: string;
  inventoryQuantity?: number | null;
}

interface ProductCarouselProps {
  products: Product[];
}

const ProductCarousel = ({ products }: ProductCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // If we have 3 or fewer products, show them in a simple grid
  if (products.length <= 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product, index) => (
          <div key={product.id} className={`fade-in-up-delayed`} style={{ animationDelay: `${index * 0.1}s` }}>
            <Link 
              to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
              className="group cursor-pointer fade-in-up block"
            >
              <ProductCard
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                description={product.description}
                inventoryQuantity={product.inventoryQuantity}
              />
            </Link>
          </div>
        ))}
      </div>
    );
  }

  // Create extended array for seamless infinity loop (Netflix style)
  const extendedProducts = [
    ...products.slice(-3), // Last 3 products at the beginning
    ...products,            // Original products
    ...products.slice(0, 3) // First 3 products at the end
  ];

  const startOffset = 3; // Start at original products

  // Initialize to start position
  useEffect(() => {
    setCurrentIndex(startOffset);
  }, [startOffset]);

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev + 3);
    
    setTimeout(() => {
      setIsTransitioning(false);
      
      // Seamless reset - jump back to equivalent position in originals
      setCurrentIndex((current) => {
        if (current >= startOffset + products.length) {
          return startOffset + (current - startOffset - products.length);
        }
        return current;
      });
    }, 1000);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev - 3);
    
    setTimeout(() => {
      setIsTransitioning(false);
      
      // Seamless reset - jump to equivalent position at the end
      setCurrentIndex((current) => {
        if (current < startOffset) {
          return startOffset + products.length - (startOffset - current);
        }
        return current;
      });
    }, 1000);
  };

  // Calculate transform for smooth sliding
  const calculateTransform = () => {
    // Each product card is 320px wide + 24px gap = 344px total
    const cardWidth = 320;
    const gap = 24;
    const totalWidth = cardWidth + gap;
    
    // We want to show 5 products: [side] [main1] [main2] [main3] [side]
    // So we need to offset by (currentIndex - 1) to center the view
    const offset = (currentIndex - 1) * totalWidth;
    
    return `translateX(-${offset}px)`;
  };

  return (
    <div className="relative w-full flex justify-center">
      {/* Carousel Container */}
      <div className="overflow-hidden" style={{ width: '1640px' }}>
        <div 
          className={`flex gap-6 ${isTransitioning ? 'transition-transform duration-1000 ease-out' : ''}`}
          style={{
            transform: calculateTransform(),
          }}
        >
          {extendedProducts.map((product, index) => {
            // Calculate relative position to current view
            const relativePosition = index - currentIndex;
            
            // Determine visibility and styling
            const isMainProduct = relativePosition >= 0 && relativePosition <= 2; // Center 3 products
            const isSideProduct = relativePosition === -1 || relativePosition === 3; // Side products
            const isVisible = relativePosition >= -1 && relativePosition <= 3; // Show 5 total

            return (
              <div
                key={`${product.id}-${index}`}
                className="flex-shrink-0"
                style={{
                  width: '320px',
                  opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.3,
                  transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)',
                  transition: isTransitioning ? 'opacity 1000ms ease-out, transform 1000ms ease-out' : 'none',
                }}
              >
                <Link 
                  to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                  className="group cursor-pointer block"
                >
                  <div className="transition-transform duration-300 ease-in-out hover:scale-105">
                    <ProductCard
                      id={product.id}
                      title={product.title}
                      price={product.price}
                      image={product.image}
                      description={product.description}
                      inventoryQuantity={product.inventoryQuantity}
                    />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30
                   w-12 h-12 md:w-14 md:h-14 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
        aria-label="Předchozí produkty"
      >
        <svg 
          className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30
                   w-12 h-12 md:w-14 md:h-14 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
        aria-label="Další produkty"
      >
        <svg 
          className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default ProductCarousel;