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
  const [currentIndex, setCurrentIndex] = useState(0); // Start at beginning of infinite array
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

  // Create truly infinite products array - repeat products to ensure we never run out
  const createInfiniteProducts = () => {
    const repeatedProducts = [];
    // Repeat products 10 times to ensure we never run out
    for (let i = 0; i < 10; i++) {
      repeatedProducts.push(...products);
    }
    return repeatedProducts;
  };
  
  const extendedProducts = createInfiniteProducts();

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev + 3);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev - 3);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  // Calculate transform - simple offset with centering
  const calculateTransform = () => {
    const cardWidth = 320;
    const gap = 32; // Increased gap for better spacing
    const totalWidth = cardWidth + gap; // 352px
    
    // Simple offset - no modulo needed since we have truly infinite array
    const offset = (currentIndex - 1) * totalWidth;
    
    return `translateX(-${offset}px)`;
  };

  return (
    <div className="relative w-full flex justify-center">
      {/* Carousel Container with fixed width */}
      <div className="relative" style={{ width: '1728px', maxWidth: '90vw' }}>
        {/* Carousel Viewport */}
        <div className="overflow-hidden">
          <div 
            className="flex gap-8"
            style={{
              transform: calculateTransform(),
              transition: isTransitioning ? 'transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
          >
            {extendedProducts.map((product, index) => {
              // Calculate relative position to current view
              const relativePosition = index - currentIndex;
              
              // Define which products are main (center 3) vs side
              const isMainProduct = relativePosition >= 0 && relativePosition <= 2;
              const isSideProduct = relativePosition === -1 || relativePosition === 3;

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: '320px',
                    opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0.2,
                    transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)',
                    transition: 'transform 1000ms ease-out, opacity 1000ms ease-out',
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
          className="absolute -left-8 top-1/2 -translate-y-1/2 z-30
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
          className="absolute -right-8 top-1/2 -translate-y-1/2 z-30
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
    </div>
  );
};

export default ProductCarousel;