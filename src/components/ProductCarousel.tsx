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

// Responzivní konfigurace podle velikosti obrazovky
const getCarouselConfig = (width: number) => {
  if (width < 768) {
    // Mobile: 1 hlavní + 0.5 boční na každé straně (částečně viditelný)
    return {
      mainCount: 1,
      sideCount: 0.5, // Částečně viditelný boční produkt
      cardWidth: width * 0.85, // 85% šířky obrazovky pro hlavní produkt
      gap: 16,
      step: 1,
      isMobile: true,
    };
  } else if (width < 1024) {
    // Tablet: 2 hlavní + 1 boční na každé straně
    return {
      mainCount: 2,
      sideCount: 1,
      cardWidth: Math.min(300, (width - 64) / 3.5), // 3.5 = 2 main + 1 side + gaps
      gap: 24,
      step: 2,
      isMobile: false,
    };
  } else if (width < 1536) {
    // Desktop: 3 hlavní + 1 boční na každé straně
    return {
      mainCount: 3,
      sideCount: 1,
      cardWidth: Math.min(320, (width - 96) / 4.5), // 4.5 = 3 main + 1 side + gaps
      gap: 32,
      step: 3,
      isMobile: false,
    };
  } else {
    // Large Desktop/TV: 3 hlavní + 1 boční na každé straně
    return {
      mainCount: 3,
      sideCount: 1,
      cardWidth: 320,
      gap: 32,
      step: 3,
      isMobile: false,
    };
  }
};

const ProductCarousel = ({ products }: ProductCarouselProps) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Responzivní detekce velikosti okna
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const config = getCarouselConfig(windowWidth);

  // If we have fewer products than mainCount + 1, show them in a simple grid
  if (products.length <= config.mainCount + 1) {
    const gridCols = windowWidth < 768 ? 1 : windowWidth < 1024 ? 2 : 3;
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols} gap-8`}>
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

  // Create infinite products array
  const createInfiniteProducts = () => {
    const repeatedProducts = [];
    for (let i = 0; i < 10; i++) {
      repeatedProducts.push(...products);
    }
    return repeatedProducts;
  };
  
  const extendedProducts = createInfiniteProducts();

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => prev + config.step);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    setCurrentIndex((prev) => Math.max(0, prev - config.step));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  // Calculate transform with responzivní values
  const calculateTransform = () => {
    const totalWidth = config.cardWidth + config.gap;
    
    if (config.isMobile) {
      // Na mobilu: centrujeme hlavní produkt uprostřed obrazovky
      // currentIndex ukazuje na hlavní produkt, takže ho musíme vycentrovat
      const offset = currentIndex * totalWidth;
      // Centrujeme: posuneme o polovinu šířky kontejneru mínus polovinu šířky karty
      return `translateX(calc(-${offset}px + 50% - ${config.cardWidth / 2}px))`;
    } else {
      // Desktop/Tablet: standardní offset s bočními produkty
      const offset = (currentIndex - config.sideCount) * totalWidth;
      return `translateX(-${offset}px)`;
    }
  };

  // Calculate container width dynamically
  const containerWidth = config.isMobile 
    ? '100%' // Full width na mobilu
    : (config.mainCount + config.sideCount * 2) * (config.cardWidth + config.gap) - config.gap;

  return (
    <div 
      className={`relative w-full flex justify-center ${config.isMobile ? 'px-0' : 'px-4 md:px-6'}`}
      style={config.isMobile ? { 
        marginLeft: 'calc(-1.5rem)', // Kompenzuje px-6 z ProductSection
        marginRight: 'calc(-1.5rem)',
        width: 'calc(100% + 3rem)' // 100% + kompenzace paddingů
      } : {}}
    >
      {/* Carousel Container with dynamic width */}
      <div 
        className="relative" 
        style={{ 
          width: config.isMobile ? containerWidth : `${containerWidth}px`, 
          maxWidth: config.isMobile ? '100%' : '100%',
        }}
      >
        {/* Carousel Viewport */}
        <div className="overflow-hidden">
          <div 
            className="flex"
            style={{
              gap: `${config.gap}px`,
              transform: calculateTransform(),
              transition: isTransitioning ? 'transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
          >
            {extendedProducts.map((product, index) => {
              const relativePosition = index - currentIndex;
              
              // Pro mobil: 1 hlavní (pozice 0) + 0.5 boční na každé straně
              // Pro ostatní: mainCount hlavních + sideCount bočních na každé straně
              let isMainProduct = false;
              let isSideProduct = false;
              let isVisible = false;
              let sideVisibility = 1; // 1 = plně viditelný, 0.5 = polovina viditelná

              if (config.isMobile) {
                // Mobil: 1 hlavní (pozice 0), 0.5 boční na pozici -0.5 a 0.5
                isMainProduct = relativePosition === 0;
                isSideProduct = relativePosition === -1 || relativePosition === 1;
                isVisible = relativePosition >= -1 && relativePosition <= 1;
                sideVisibility = 0.5; // Boční produkty jsou z poloviny viditelné
              } else {
                // Desktop/Tablet: mainCount hlavních + sideCount bočních
                isMainProduct = relativePosition >= 0 && relativePosition < config.mainCount;
                isSideProduct = 
                  (relativePosition >= -config.sideCount && relativePosition < 0) ||
                  (relativePosition >= config.mainCount && relativePosition < config.mainCount + config.sideCount);
                isVisible = relativePosition >= -config.sideCount && relativePosition < config.mainCount + config.sideCount;
                sideVisibility = 1;
              }

              // Pro mobil: boční produkty mají clip-path pro zobrazení jen poloviny
              const sideClipStyle = config.isMobile && isSideProduct 
                ? { clipPath: relativePosition === -1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }
                : {};

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: `${config.cardWidth}px`,
                    opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0,
                    transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)',
                    transition: isTransitioning ? 'transform 1000ms ease-out, opacity 1000ms ease-out' : 'none',
                    visibility: isVisible ? 'visible' : 'hidden',
                    ...sideClipStyle,
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

        {/* Navigation Arrows - responzivní pozice */}
        <button
          onClick={prevSlide}
          className={`absolute top-1/2 -translate-y-1/2 z-30
                     w-10 h-10 md:w-12 md:h-12 rounded-full
                     bg-background/90 backdrop-blur-sm border border-border/50
                     flex items-center justify-center
                     hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                     transition-all duration-300 ease-in-out
                     group
                     ${config.isMobile ? 'left-2' : '-left-8'}`}
          aria-label="Předchozí produkty"
        >
          <svg 
            className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className={`absolute top-1/2 -translate-y-1/2 z-30
                     w-10 h-10 md:w-12 md:h-12 rounded-full
                     bg-background/90 backdrop-blur-sm border border-border/50
                     flex items-center justify-center
                     hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                     transition-all duration-300 ease-in-out
                     group
                     ${config.isMobile ? 'right-2' : '-right-8'}`}
          aria-label="Další produkty"
        >
          <svg 
            className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
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