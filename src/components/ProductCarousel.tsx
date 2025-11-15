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
  // Desktop/Tablet: začíná na 1 (ukazuje na první hlavní produkt, index 0 je boční vlevo)
  // Mobil: začíná na 0 (ukazuje na hlavní produkt)
  const initialIndex = windowWidth < 768 ? 0 : 1;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Reset currentIndex když se změní velikost obrazovky
  useEffect(() => {
    const newIndex = windowWidth < 768 ? 0 : 1;
    setCurrentIndex(newIndex);
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
    
    // Minimální hodnota: 0 pro mobil, 1 pro desktop/tablet
    const minIndex = config.isMobile ? 0 : 1;
    setCurrentIndex((prev) => Math.max(minIndex, prev - config.step));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  // Calculate transform with responzivní values
  const calculateTransform = () => {
    const totalWidth = config.cardWidth + config.gap;
    
    if (config.isMobile) {
      // Na mobilu: centrujeme hlavní produkt uprostřed obrazovky
      // currentIndex ukazuje na hlavní produkt (začíná na 0)
      // Všechny produkty mají plnou šířku, boční jsou zobrazeny pomocí clip-path
      // Struktura: index 0 (boční vlevo) + gap + index 1 (hlavní) + gap + index 2 (boční vpravo)
      const offset = currentIndex * totalWidth;
      // Centrujeme: posuneme o polovinu šířky kontejneru mínus polovinu šířky hlavního produktu
      return `translateX(calc(-${offset}px + 50% - ${config.cardWidth / 2}px))`;
    } else if (config.sideCount === 0.5) {
      // Tablet/Menší notebooky: currentIndex začíná na 1 (ukazuje na první hlavní produkt)
      // Všechny produkty mají plnou šířku v layoutu, boční jsou zobrazeny pomocí clip-path
      // Transformace: stejná logika jako desktop pro konzistentní mezery
      const offset = (currentIndex - 1) * totalWidth;
      return `translateX(-${offset}px)`;
    } else {
      // Large Desktop: currentIndex začíná na 1
      // offset = (currentIndex - 1) * totalWidth zobrazí 1 boční vlevo + hlavní produkty
      const offset = (currentIndex - 1) * totalWidth;
      return `translateX(-${offset}px)`;
    }
  };

  // Calculate container width dynamically
  // Large Desktop: 3 hlavní + 1 boční na každé straně = 5 produktů (plně viditelných)
  // Menší notebooky/Tablet: 3-2 hlavní + 0.5 boční vlevo + 0.5 boční vpravo (částečně viditelné)
  // Mobil: 100% (full width)
  // Pro tablet/menší notebooky: v layoutu máme 5 produktů (index 0-4), každý s plnou šířkou
  // Kontejner musí být široký pro všechny produkty, aby se boční produkt vpravo zobrazil
  // Šířka kontejneru = (mainCount + 2) * (cardWidth + gap) - gap (5 produktů pro menší notebooky)
  const containerWidth = config.isMobile 
    ? '100%' // Full width na mobilu
    : config.sideCount === 1
      ? (config.mainCount + config.sideCount * 2) * (config.cardWidth + config.gap) - config.gap // 5 produktů: (3 + 1*2) * (320 + 32) - 32 = 1728px
      : (config.mainCount + 2) * (config.cardWidth + config.gap) - config.gap; // 5 produktů: (3 + 2) * (cardWidth + gap) - gap
      // Tablet: (2 + 2) * (cardWidth + gap) - gap = 4 * (cardWidth + gap) - gap
      // Menší notebooky: (3 + 2) * (cardWidth + gap) - gap = 5 * (cardWidth + gap) - gap

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
                // Mobil: relativePosition -1 až 1 (0.5 boční vlevo, 1 hlavní, 0.5 boční vpravo)
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

              // Všechny produkty mají plnou šířku v layoutu pro konzistentní mezery
              // Boční produkty jsou zobrazeny pomocí clip-path (zobrazí se jen polovina)
              const isHalfSideProduct = (config.isMobile || config.sideCount === 0.5) && isSideProduct;
              const productWidth = config.cardWidth; // VŠECHNY produkty mají plnou šířku
              
              // Clip-path pro částečně viditelné boční produkty (sideCount === 0.5)
              const sideClipStyle = isHalfSideProduct
                ? { clipPath: relativePosition === -1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' } // Zobrazí jen polovinu produktu
                : {};

              // Transformace pro boční produkty - posune je tak, aby mezery byly konzistentní
              // Boční vlevo: posune o polovinu šířky vlevo, aby viditelná část byla blíž k hlavním
              // Boční vpravo: posune o polovinu šířky vpravo, aby viditelná část byla blíž k hlavním
              let sideTransform = '';
              if (isHalfSideProduct) {
                if (relativePosition === -1) {
                  // Boční vlevo: posunout vlevo
                  sideTransform = ` translateX(${config.cardWidth / 2}px)`;
                } else if (relativePosition === config.mainCount) {
                  // Boční vpravo: posunout vpravo
                  sideTransform = ` translateX(-${config.cardWidth / 2}px)`;
                }
              }

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: `${productWidth}px`,
                    opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0,
                    transform: `${isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)'}${sideTransform}`,
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
                   ${config.isMobile ? 'left-2' : config.sideCount === 0.5 ? 'left-4' : 'left-8'}`}
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
                   ${config.isMobile ? 'right-2' : config.sideCount === 0.5 ? 'right-4' : 'right-8'}`}
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