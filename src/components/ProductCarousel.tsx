import { useState } from 'react';
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

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => {
      const next = prev + 3;
      // Loop back to start if we've gone past the end
      return next >= products.length ? 0 : next;
    });
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => {
      const previous = prev - 3;
      // Loop to end if we've gone before the start
      if (previous < 0) {
        // Find the last valid starting position
        const remainder = products.length % 3;
        return remainder === 0 ? products.length - 3 : products.length - remainder;
      }
      return previous;
    });
    setTimeout(() => setIsTransitioning(false), 600);
  };

  // Create an extended array for smooth infinity loop
  // We need extra products on both sides for the side preview effect
  const extendedProducts = [
    ...products.slice(-2), // Last 2 products at the beginning
    ...products,
    ...products.slice(0, 5), // First 5 products at the end
  ];

  // Calculate the offset - we start at index 2 because we added 2 products at the beginning
  const offset = currentIndex + 2;

  return (
    <div className="relative px-4 md:px-8 lg:px-12">
      {/* Carousel Container with overflow hidden */}
      <div className="overflow-hidden">
        <div 
          className={`flex gap-6 ${isTransitioning ? 'transition-transform duration-600 ease-in-out' : ''}`}
          style={{
            transform: `translateX(calc(-${offset * (100 / 3)}% - ${offset * 1.5}rem))`,
          }}
        >
          {extendedProducts.map((product, index) => {
            // Calculate which products should be visible and styled
            const positionFromCenter = index - offset - 1; // -2 to 2 range for 5 visible items
            const isMainProduct = positionFromCenter >= -1 && positionFromCenter <= 1; // Center 3 products
            const isSideProduct = Math.abs(positionFromCenter) === 2; // Side products

            return (
              <div
                key={`${product.id}-${index}`}
                className={`flex-shrink-0 transition-all duration-600 ease-in-out`}
                style={{
                  width: 'calc(33.333% - 1rem)',
                  opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.3,
                  transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.85)' : 'scale(0.75)',
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
