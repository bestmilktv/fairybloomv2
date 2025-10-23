import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    setCurrentIndex((prev) => (prev + 1) % products.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Get the 5 products to display (2 before, 1 current, 2 after)
  const getVisibleProducts = () => {
    const visibleProducts = [];
    for (let i = -2; i <= 2; i++) {
      const index = (currentIndex + i + products.length) % products.length;
      visibleProducts.push({
        ...products[index],
        position: i, // -2, -1, 0, 1, 2
      });
    }
    return visibleProducts;
  };

  const visibleProducts = getVisibleProducts();

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
          {visibleProducts.map((product, index) => {
            const position = product.position;
            const isCenter = position === 0;
            const isSide = Math.abs(position) === 1;
            const isEdge = Math.abs(position) === 2;

            return (
              <div
                key={`${product.id}-${currentIndex}-${position}`}
                className={`
                  transition-all duration-500 ease-in-out transform
                  ${isCenter ? 'z-20 scale-100 opacity-100' : ''}
                  ${isSide ? 'z-10 scale-90 opacity-70' : ''}
                  ${isEdge ? 'z-0 scale-75 opacity-40' : ''}
                  ${isTransitioning ? 'pointer-events-none' : 'pointer-events-auto'}
                `}
                style={{
                  transform: `translateX(${position * 20}px) ${isCenter ? 'scale(1)' : isSide ? 'scale(0.9)' : 'scale(0.75)'}`,
                }}
              >
                <Link 
                  to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                  className="group cursor-pointer block"
                >
                  <div className={`
                    transition-all duration-300 ease-in-out
                    ${isCenter ? 'hover:scale-105' : 'hover:scale-110'}
                    ${isEdge ? 'cursor-pointer' : ''}
                  `}>
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
        disabled={isTransitioning}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-8 z-30
                   w-12 h-12 md:w-14 md:h-14 rounded-full
                   bg-background/80 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   disabled:opacity-50 disabled:cursor-not-allowed
                   group"
        aria-label="Předchozí produkt"
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
        disabled={isTransitioning}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-8 z-30
                   w-12 h-12 md:w-14 md:h-14 rounded-full
                   bg-background/80 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   disabled:opacity-50 disabled:cursor-not-allowed
                   group"
        aria-label="Další produkt"
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

      {/* Product Counter */}
      <div className="text-center mt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {products.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCarousel;
