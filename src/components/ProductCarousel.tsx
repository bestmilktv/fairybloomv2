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

  // Create extended array for seamless infinity loop
  // We need enough clones to support smooth transitions
  const cloneCount = products.length;
  const extendedProducts = [
    ...products.slice(-cloneCount), // Clone at the beginning
    ...products,                    // Original products
    ...products.slice(0, cloneCount) // Clone at the end
  ];

  // Start position: we begin at the original products (after the first clone set)
  const startOffset = cloneCount;

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
      
      // Check if we need to reset (seamless jump)
      setCurrentIndex((current) => {
        // If we've moved past the original products, reset to the equivalent position in originals
        if (current >= startOffset + products.length) {
          const offset = current - (startOffset + products.length);
          return startOffset + offset;
        }
        return current;
      });
    }, 600);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev - 3);
    
    setTimeout(() => {
      setIsTransitioning(false);
      
      // Check if we need to reset (seamless jump)
      setCurrentIndex((current) => {
        // If we've moved before the originals, jump to the equivalent position at the end
        if (current < startOffset) {
          const offset = startOffset - current;
          return startOffset + products.length - offset;
        }
        return current;
      });
    }, 600);
  };

  // Calculate the translateX value
  // We want to show 5 products: [prev] [current] [current+1] [current+2] [next]
  // Each product is 320px + 1.5rem gap
  const calculateTransform = () => {
    // We want to center the view on the current product (index 1 of 5 visible)
    // So we need to offset by (currentIndex - 1) to show the right products
    const offset = currentIndex - 1;
    // Each product is 320px + 1.5rem gap
    const productWidth = 320; // px
    const gap = 24; // 1.5rem = 24px
    const totalWidth = productWidth + gap;
    return `translateX(-${offset * totalWidth}px)`;
  };

  return (
    <div className="relative px-4 md:px-8 lg:px-16 py-4">
      {/* Carousel Container */}
      <div className="overflow-hidden">
        <div 
          className={`flex gap-6 ${isTransitioning ? 'carousel-slide' : ''}`}
          style={{
            transform: calculateTransform(),
            width: 'max-content', // Ensure container fits content
          }}
        >
          {extendedProducts.map((product, index) => {
            // Determine if this product is in the visible range and its styling
            const relativePosition = index - currentIndex;
            // Visible range: -1 (left side) to +3 (right side)
            const isVisible = relativePosition >= -1 && relativePosition <= 3;
            const isMainProduct = relativePosition >= 0 && relativePosition <= 2; // Center 3
            const isSideProduct = relativePosition === -1 || relativePosition === 3; // Sides

            return (
              <div
                key={`${product.id}-${index}`}
                className="flex-shrink-0"
                style={{
                  width: '320px', // Fixed width for consistent sizing
                  opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.2,
                  transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.85)' : 'scale(0.7)',
                  transition: isTransitioning ? 'opacity 600ms ease-in-out, transform 600ms ease-in-out' : 'none',
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
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30
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
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30
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
