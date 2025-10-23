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
  const [currentIndex, setCurrentIndex] = useState(3);
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
  const extendedProducts = [
    ...products.slice(-3),  // Last 3 at beginning
    ...products,            // Originals
    ...products.slice(0, 3) // First 3 at end
  ];

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    const newIndex = currentIndex + 3;
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
    
    // Seamless reset after animation completes
    setTimeout(() => {
      if (newIndex >= 3 + products.length) {
        setCurrentIndex(3 + (newIndex - 3 - products.length));
      }
    }, 1010);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    const newIndex = currentIndex - 3;
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
    
    // Seamless reset after animation completes
    setTimeout(() => {
      if (newIndex < 3) {
        setCurrentIndex(3 + products.length - (3 - newIndex));
      }
    }, 1010);
  };

  // Calculate transform for perfect centering
  const calculateTransform = () => {
    const cardWidth = 320;
    const gap = 24;
    const totalWidth = cardWidth + gap; // 344px
    
    // Offset pro zobrazení 5 produktů (1 + 3 + 1)
    const offset = (currentIndex - 1) * totalWidth;
    
    return `translateX(-${offset}px)`;
  };

  return (
    <div className="carousel-container">
      {/* Carousel Viewport */}
      <div className="carousel-viewport">
        <div 
          className="carousel-track"
          style={{
            transform: calculateTransform(),
            transition: isTransitioning ? 'transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {extendedProducts.map((product, index) => {
            // Determine product position relative to current view
            const relativePosition = index - currentIndex;
            
            // Define which products are main (center 3) vs side
            const isMainProduct = relativePosition >= 0 && relativePosition <= 2; // Positions 0, 1, 2
            const isSideProduct = relativePosition === -1 || relativePosition === 3; // Positions -1, 3

            return (
              <div
                key={`${product.id}-${index}`}
                className="carousel-item"
                style={{
                  opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.2,
                  transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)',
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