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

  // Create extended array for seamless infinity loop
  const cloneCount = Math.max(5, Math.ceil(products.length / 2));
  const extendedProducts = [
    ...products.slice(-cloneCount), // Last products at the beginning
    ...products,                    // Original products
    ...products.slice(0, cloneCount) // First products at the end
  ];

  const startOffset = cloneCount;
  const totalProducts = products.length;

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => {
      const nextIndex = prev + 3;
      // If we've gone past the original products, reset to start
      if (nextIndex >= startOffset + totalProducts) {
        return startOffset;
      }
      return nextIndex;
    });
    
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => {
      const prevIndex = prev - 3;
      // If we've gone before the start, jump to the end
      if (prevIndex < startOffset) {
        return startOffset + totalProducts - 3;
      }
      return prevIndex;
    });
    
    setTimeout(() => setIsTransitioning(false), 600);
  };

  // Calculate which products should be visible (5 total: 1 + 3 + 1)
  const getVisibleProducts = () => {
    const visibleProducts = [];
    for (let i = -1; i <= 3; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < extendedProducts.length) {
        const product = extendedProducts[index];
        visibleProducts.push({
          ...product,
          position: i, // -1, 0, 1, 2, 3
        });
      }
    }
    return visibleProducts;
  };

  const visibleProducts = getVisibleProducts();

  return (
    <div className="relative px-4 md:px-8 lg:px-12">
      {/* Carousel Container */}
      <div className="overflow-hidden">
        <div 
          className={`flex gap-6 ${isTransitioning ? 'carousel-slide' : ''}`}
          style={{
            transform: `translateX(calc(-${currentIndex * (100 / 5)}% - ${currentIndex * 1.5}rem))`,
          }}
        >
          {visibleProducts.map((product, index) => {
            const position = product.position;
            const isMainProduct = position >= 0 && position <= 2; // Positions 0, 1, 2 (center 3)
            const isSideProduct = position === -1 || position === 3; // Positions -1, 3 (sides)

            return (
              <div
                key={`${product.id}-${currentIndex}-${position}`}
                className="flex-shrink-0 carousel-item"
                style={{
                  width: 'calc(20% - 1.2rem)', // 5 products = 20% each
                }}
              >
                <Link 
                  to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                  className="group cursor-pointer block"
                >
                  <div 
                    className="transition-transform duration-300 ease-in-out hover:scale-105"
                    style={{
                      opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.3,
                      transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.85)' : 'scale(0.75)',
                    }}
                  >
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