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
    // Mobile: 1 hlavní + 0.25 boční na každé straně (1/4 viditelný)
    return {
      mainCount: 1,
      sideCount: 0.25, // 1/4 viditelný boční produkt
      cardWidth: width * 0.85, // 85% šířky obrazovky pro hlavní produkt
      gap: 16,
      step: 1,
      isMobile: true,
    };
  } else if (width < 1024) {
    // Tablet: 2 hlavní + 0.5 boční na každé straně (částečně viditelný)
    return {
      mainCount: 2,
      sideCount: 0.5, // Částečně viditelný boční produkt
      cardWidth: Math.min(300, (width - 64) / 3), // 3 = 2 main + 0.5 side na každé straně
      gap: 24,
      step: 2,
      isMobile: false,
      isTablet: true,
    };
  } else if (width < 1536) {
    // Menší notebooky: 3 hlavní + 0.5 boční na každé straně (částečně viditelný) nebo menší karty
    return {
      mainCount: 3,
      sideCount: 0.5, // Částečně viditelný boční produkt
      cardWidth: Math.min(300, (width - 96) / 4), // 4 = 3 main + 0.5 side na každé straně
      gap: 32,
      step: 3,
      isMobile: false,
      isTablet: false,
    };
  } else {
    // Large Desktop/TV: 3 hlavní + 1 boční na každé straně (plně viditelný)
    return {
      mainCount: 3,
      sideCount: 1,
      cardWidth: 320,
      gap: 32,
      step: 3,
      isMobile: false,
      isTablet: false,
    };
  }
};

const ProductCarousel = ({ products }: ProductCarouselProps) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
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
  
  // Počáteční currentIndex podle velikosti obrazovky
  // Všechny breakpointy: začíná na 1 (ukazuje na první hlavní produkt, index 0 je boční vlevo)
  // Na mobilu: index 0 = boční vlevo, index 1 = hlavní, index 2 = boční vpravo
  const initialIndex = 1;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Reset currentIndex když se změní velikost obrazovky
  useEffect(() => {
    setCurrentIndex(1);
  }, [windowWidth]);

  // Carousel se zobrazí jen když je více než 3 produkty
  // Pokud je 3 nebo méně, zobrazí se grid
  if (products.length <= 3) {
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
    
    // Minimální hodnota: 1 pro všechny breakpointy (index 0 je boční vlevo)
    setCurrentIndex((prev) => Math.max(1, prev - config.step));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  // Calculate transform with responzivní values
  const calculateTransform = () => {
    if (config.isMobile) {
      // Na mobilu: centrujeme hlavní produkt uprostřed obrazovky
      // currentIndex začíná na 1 (ukazuje na první hlavní produkt, index 0 je boční vlevo)
      // Struktura: index 0 (boční vlevo, šířka 0.25*cardWidth) + gap + index 1 (hlavní, šířka cardWidth) + gap + index 2 (boční vpravo, šířka 0.25*cardWidth)
      const sideWidth = config.cardWidth * config.sideCount;
      const sideGap = config.gap;
      const mainGap = config.gap;
      // Offset = šířka bočního vlevo + gap + (currentIndex - 1) * (cardWidth + gap)
      const offset = sideWidth + sideGap + (currentIndex - 1) * (config.cardWidth + mainGap);
      // Centrujeme: posuneme o polovinu šířky kontejneru mínus polovinu šířky hlavního produktu
      return `translateX(calc(-${offset}px + 50% - ${config.cardWidth / 2}px))`;
    } else if (config.sideCount === 0.5) {
      // Tablet/Menší notebooky: currentIndex začíná na 1 (ukazuje na první hlavní produkt)
      // Struktura: boční vlevo (0.5*cardWidth) + gap + hlavní produkty + gap + boční vpravo (0.5*cardWidth)
      const sideWidth = config.cardWidth * config.sideCount;
      const offset = sideWidth + config.gap + (currentIndex - 1) * (config.cardWidth + config.gap);
      return `translateX(-${offset}px)`;
    } else {
      // Large Desktop: currentIndex začíná na 1
      // offset = (currentIndex - 1) * totalWidth zobrazí 1 boční vlevo + hlavní produkty
      const totalWidth = config.cardWidth + config.gap;
      const offset = (currentIndex - 1) * totalWidth;
      return `translateX(-${offset}px)`;
    }
  };

  // Calculate container width dynamically
  // Large Desktop: 3 hlavní + 1 boční na každé straně = 5 produktů (plně viditelných)
  // Menší notebooky/Tablet: 3-2 hlavní + 0.5 boční vlevo + 0.5 boční vpravo (částečně viditelné)
  // Mobil: 1 hlavní + 0.25 boční vlevo + 0.25 boční vpravo
  // Pro částečně viditelné produkty: wrapper má šířku sideCount * cardWidth
  const containerWidth = config.isMobile 
    ? '100%' // Full width na mobilu
    : config.sideCount === 1
      ? (config.mainCount + config.sideCount * 2) * (config.cardWidth + config.gap) - config.gap // 5 produktů: (3 + 1*2) * (320 + 32) - 32 = 1728px
      : (config.sideCount * config.cardWidth) + // Boční vlevo
        config.gap +
        (config.mainCount * (config.cardWidth + config.gap)) - config.gap + // Hlavní produkty
        config.gap +
        (config.sideCount * config.cardWidth); // Boční vpravo

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
          maxWidth: config.isMobile ? '100%' : 'none',
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
              
              // Určení viditelnosti a typu produktu podle breakpointu
              let isMainProduct = false;
              let isSideProduct = false;
              let isVisible = false;

              if (config.isMobile) {
                // Mobil: currentIndex začíná na 1 (ukazuje na první hlavní produkt)
                // V layoutu: index 0 = boční vlevo, index 1 = hlavní, index 2 = boční vpravo
                // relativePosition = index - currentIndex
                // Pro currentIndex = 1: relativePosition -1 = boční vlevo, 0 = hlavní, 1 = boční vpravo
                isMainProduct = relativePosition === 0;
                isSideProduct = relativePosition === -1 || relativePosition === 1;
                isVisible = relativePosition >= -1 && relativePosition <= 1;
              } else {
                // Desktop/Tablet: určení podle sideCount
                if (config.sideCount === 1) {
                  // Large Desktop: relativePosition -1 až 3 (1 boční vlevo, 3 hlavní, 1 boční vpravo)
                  // mainCount = 3, takže hlavní jsou na pozicích 0, 1, 2
                  // Boční vlevo je na pozici -1, boční vpravo je na pozici 3
                  isMainProduct = relativePosition >= 0 && relativePosition < config.mainCount;
                  isSideProduct = relativePosition === -1 || relativePosition === config.mainCount;
                  isVisible = relativePosition >= -1 && relativePosition <= config.mainCount; // -1 až 3
                } else {
                  // Tablet/Menší notebooky: relativePosition -1 až mainCount (0.5 boční vlevo, 2-3 hlavní, 0.5 boční vpravo)
                  // Tablet: mainCount = 2, takže hlavní jsou na pozicích 0, 1, boční vpravo na pozici 2
                  // Menší notebooky: mainCount = 3, takže hlavní jsou na pozicích 0, 1, 2, boční vpravo na pozici 3
                  isMainProduct = relativePosition >= 0 && relativePosition < config.mainCount;
                  isSideProduct = relativePosition === -1 || relativePosition === config.mainCount;
                  isVisible = relativePosition >= -1 && relativePosition <= config.mainCount; // -1 až mainCount
                }
              }

              // Určení šířky a stylů pro produkty
              const isPartialSideProduct = (config.isMobile || config.sideCount === 0.5 || config.sideCount === 0.25) && isSideProduct;
              
              // Pro boční produkty s částečnou viditelností: wrapper má šířku viditelné části
              // Produkt uvnitř má plnou šířku a je posunutý tak, aby byla viditelná správná část
              let wrapperWidth = config.cardWidth;
              let productOffset = 0;
              let wrapperStyle: React.CSSProperties = {};
              
              if (isPartialSideProduct) {
                if (config.sideCount === 0.25) {
                  // Telefon: 1/4 viditelné
                  wrapperWidth = config.cardWidth * 0.25;
                  if (relativePosition === -1) {
                    // Boční vlevo: zobrazíme pravou 1/4 produktu
                    // Produkt je posunutý vlevo o 75% své šířky, takže viditelná je pravá 1/4
                    productOffset = -config.cardWidth * 0.75;
                  } else if (relativePosition === 1 || relativePosition === config.mainCount) {
                    // Boční vpravo: zobrazíme levou 1/4 produktu
                    // Produkt není posunutý, takže viditelná je levá 1/4
                    productOffset = 0;
                  }
                } else if (config.sideCount === 0.5) {
                  // Tablet/Menší notebook: 1/2 viditelné
                  wrapperWidth = config.cardWidth * 0.5;
                  if (relativePosition === -1) {
                    // Boční vlevo: zobrazíme pravou polovinu produktu
                    // Produkt je posunutý vlevo o 50% své šířky, takže viditelná je pravá 1/2
                    productOffset = -config.cardWidth * 0.5;
                  } else if (relativePosition === config.mainCount) {
                    // Boční vpravo: zobrazíme levou polovinu produktu
                    // Produkt není posunutý, takže viditelná je levá 1/2
                    productOffset = 0;
                  }
                }
              }

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: `${wrapperWidth}px`,
                    overflow: isPartialSideProduct ? 'hidden' : 'visible',
                    opacity: isMainProduct 
                      ? 1 
                      : isSideProduct 
                        ? (config.sideCount === 1 ? 0.5 : 0.4) // Plně viditelné: 0.5, částečně viditelné: 0.4
                        : 0,
                    transform: isMainProduct 
                      ? 'scale(1)' 
                      : isSideProduct 
                        ? (config.sideCount === 1 ? 'scale(0.85)' : 'scale(0.75)') // Plně viditelné: 0.85, částečně viditelné: 0.75
                        : 'scale(0.6)',
                    transition: isTransitioning ? 'transform 1000ms ease-out, opacity 1000ms ease-out' : 'none',
                    visibility: isVisible ? 'visible' : 'hidden',
                    ...wrapperStyle,
                  }}
                >
                  <div
                    style={{
                      width: `${config.cardWidth}px`,
                      transform: productOffset !== 0 ? `translateX(${productOffset}px)` : 'none',
                      transition: isTransitioning ? 'transform 1000ms ease-out' : 'none',
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Arrows - responzivní pozice (umístěné ve vnějším kontejneru pro viditelnost) */}
      <button
        onClick={prevSlide}
        className={`absolute top-1/2 -translate-y-1/2 z-30
                   w-10 h-10 md:w-12 md:h-12 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group
                   ${config.isMobile ? 'left-2' : config.sideCount === 0.5 ? 'left-4' : '-left-8'}`}
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
                   ${config.isMobile ? 'right-2' : config.sideCount === 0.5 ? 'right-4' : '-right-8'}`}
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
  );
};

export default ProductCarousel;