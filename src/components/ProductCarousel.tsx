import { useState, useEffect, useRef, useCallback } from 'react';
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
  // Edge case: Prázdné pole
  if (products.length === 0) {
    return null;
  }

  // Vytvoření infinite pole produktů pomocí klonování
  const CLONE_COUNT = 5; // Počet klonů na každé straně
  const clonedProducts = [
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products),
    ...products,
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products),
  ];
  
  // Počáteční index na začátku reálných produktů
  const initialIndex = CLONE_COUNT * products.length;
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Detekce velikosti obrazovky a šířky kontejneru
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        setIsMobile(width < 768);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Edge case: Pokud je málo produktů (≤3), zobrazíme grid místo carouselu
  // Carousel potřebuje alespoň 4 produkty pro správné zobrazení (3 hlavní + 1 boční)
  if (products.length <= 3) {
    const gridCols = containerWidth < 768 ? 1 : containerWidth < 1024 ? 2 : 3;
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols} gap-8`}>
        {products.map((product, index) => (
          <div key={product.id} className="fade-in-up-delayed" style={{ animationDelay: `${index * 0.1}s` }}>
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


  // Výpočet šířky karty a mezery
  const getCardConfig = () => {
    if (isMobile) {
      // Mobil: 1 produkt, full-width s malým peekem
      return {
        cardWidthPercent: 90, // 90% šířky kontejneru
        gap: 16,
        visibleCards: 1,
      };
    } else {
      // Desktop: 3 hlavní + 2 boční (celkem 5 viditelných)
      // Každá karta má šířku cca 16% (5 karet × 16% = 80%, zbytek pro mezery)
      return {
        cardWidthPercent: 16,
        gap: 24,
        visibleCards: 5, // 3 hlavní + 2 boční
      };
    }
  };

  const config = getCardConfig();
  const cardWidth = containerWidth > 0 ? (containerWidth * config.cardWidthPercent) / 100 : 0;
  const gap = config.gap;
  const totalCardWidth = cardWidth + gap;

  // Výpočet transformace pro centrování
  const getTransform = (index: number, dragOffset: number = 0) => {
    if (containerWidth === 0 || cardWidth === 0) return 'translateX(0)';
    
    // Počáteční offset pro centrování
    const centerOffset = containerWidth / 2;
    
    // Offset pro aktuální kartu
    const cardOffset = index * totalCardWidth;
    
    // Celkový transform
    const totalOffset = centerOffset - cardOffset - (cardWidth / 2) + dragOffset;
    
    return `translateX(${totalOffset}px)`;
  };

  /**
   * INFINITE LOOP RESET - Logika pro plynulý infinite loop bez viditelného skoku
   * 
   * Jak to funguje:
   * 1. Pole produktů je rozšířeno o klony na začátku a konci (CLONE_COUNT × produkty)
   * 2. Reálné produkty začínají na indexu: CLONE_COUNT * products.length
   * 3. Když uživatel dojde na konec klonů (za reálné produkty), okamžitě (bez animace)
   *    skočíme na začátek reálných produktů
   * 4. Když uživatel dojde na začátek klonů (před reálné produkty), okamžitě skočíme
   *    na konec reálných produktů
   * 
   * Důležité: Transition se vypne před resetem (okamžitý skok) a zapne zpět po resetu,
   * aby další navigace byla plynulá. Používáme requestAnimationFrame pro zajištění,
   * že se změny provedou ve správném pořadí renderů.
   */
  useEffect(() => {
    // Resetujeme pouze když není aktivní transition ani drag
    if (isTransitioning || isDragging) return;
    
    const realProductsStart = CLONE_COUNT * products.length;
    const realProductsEnd = realProductsStart + products.length - 1;
    
    // Edge case: Pokud jsme mimo rozsah reálných produktů, resetujeme
    if (currentIndex < realProductsStart) {
      // Jsme na začátku klonů → skočíme na konec reálných produktů
      setIsTransitioning(false); // Vypneme transition pro okamžitý skok
      requestAnimationFrame(() => {
        setCurrentIndex(realProductsEnd);
        // Po resetu zapneme transition zpět pro další navigaci
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    } else if (currentIndex > realProductsEnd) {
      // Jsme na konci klonů → skočíme na začátek reálných produktů
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentIndex(realProductsStart);
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }
  }, [currentIndex, products.length, isTransitioning, isDragging]);

  // Navigace
  const goToNext = useCallback(() => {
    if (isDragging) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isDragging]);

  const goToPrev = useCallback(() => {
    if (isDragging) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isDragging]);

  // Swipe & Drag handlers
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
    setIsTransitioning(false);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current) return;
    
    const diff = clientX - startX;
    setTranslateX(diff);
    
    // Zrušíme předchozí animation frame pokud existuje
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isDragging, startX]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Pokud jsme táhli dostatečně daleko, přepneme na další/předchozí kartu
    const threshold = cardWidth * 0.3; // 30% šířky karty
    
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    } else {
      // Vrátíme se zpět
      setIsTransitioning(true);
    }
    
    setTranslateX(0);
  }, [isDragging, translateX, cardWidth, goToNext, goToPrev]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Globální mouse eventy pro drag mimo kontejner
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX);
      };
      
      const handleGlobalMouseUp = () => {
        handleEnd();
      };
      
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  // Určení pozice karty relativně k centru
  const getCardPosition = (index: number) => {
    const centerIndex = currentIndex;
    const relativePosition = index - centerIndex;
    return relativePosition;
  };

  // Určení stylu karty podle pozice
  const getCardStyle = (relativePosition: number) => {
    const absPosition = Math.abs(relativePosition);
    
    if (isMobile) {
      // Mobil: pouze centrální karta je plně viditelná
      if (absPosition === 0) {
        return {
          opacity: 1,
          transform: 'scale(1)',
          zIndex: 10,
        };
      } else if (absPosition === 1) {
        // Boční karty jsou částečně viditelné
        return {
          opacity: 0.3,
          transform: 'scale(0.85)',
          zIndex: 5,
        };
      } else {
        return {
          opacity: 0,
          transform: 'scale(0.8)',
          zIndex: 1,
        };
      }
    } else {
      // Desktop: 3 hlavní (pozice -1, 0, 1) + 2 boční (pozice -2, 2)
      if (absPosition <= 1) {
        // Hlavní produkty (3 uprostřed)
        return {
          opacity: 1,
          transform: 'scale(1)',
          zIndex: 10,
        };
      } else if (absPosition === 2) {
        // Boční produkty
        return {
          opacity: 0.5,
          transform: 'scale(0.85)',
          zIndex: 5,
        };
      } else {
        return {
          opacity: 0,
          transform: 'scale(0.8)',
          zIndex: 1,
        };
      }
    }
  };

  // Určení viditelnosti karty
  const isCardVisible = (relativePosition: number) => {
    if (isMobile) {
      return Math.abs(relativePosition) <= 1;
    } else {
      return Math.abs(relativePosition) <= 2; // 3 hlavní + 2 boční
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden"
    >
      {/* Carousel Viewport */}
      <div className="relative w-full h-full">
        {/* Track */}
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: getTransform(currentIndex, translateX),
            transition: isTransitioning && !isDragging 
              ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' 
              : 'none',
            willChange: 'transform',
            gap: `${gap}px`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={isDragging ? handleMouseUp : undefined}
        >
          {clonedProducts.map((product, index) => {
            const relativePosition = getCardPosition(index);
            const absPosition = Math.abs(relativePosition);
            const cardStyle = getCardStyle(relativePosition);
            const visible = isCardVisible(relativePosition);

            if (!visible) {
              return (
                <div
                  key={`${product.id}-${index}`}
                  style={{
                    width: `${cardWidth}px`,
                    flexShrink: 0,
                    visibility: 'hidden',
                  }}
                />
              );
            }

            return (
              <div
                key={`${product.id}-${index}`}
                className="flex-shrink-0"
                style={{
                  width: `${cardWidth}px`,
                  opacity: cardStyle.opacity,
                  transform: cardStyle.transform,
                  zIndex: cardStyle.zIndex,
                  transition: isTransitioning && !isDragging
                    ? 'opacity 500ms ease-out, transform 500ms ease-out'
                    : 'none',
                  pointerEvents: absPosition === 0 ? 'auto' : 'none', // Pouze centrální karta je klikatelná
                }}
              >
                <Link 
                  to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                  className="group cursor-pointer block w-full h-full"
                  onClick={(e) => {
                    // Pokud jsme táhli, nechceme otevřít link
                    if (isDragging || Math.abs(translateX) > 10) {
                      e.preventDefault();
                    }
                  }}
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
      {!isMobile && (
        <>
          <button
            onClick={goToPrev}
            className="absolute top-1/2 -translate-y-1/2 -left-12 z-30
                     w-12 h-12 rounded-full
                     bg-background/90 backdrop-blur-sm border border-border/50
                     flex items-center justify-center
                     hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                     transition-all duration-300 ease-in-out
                     group"
            aria-label="Předchozí produkty"
          >
            <svg 
              className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            className="absolute top-1/2 -translate-y-1/2 -right-12 z-30
                     w-12 h-12 rounded-full
                     bg-background/90 backdrop-blur-sm border border-border/50
                     flex items-center justify-center
                     hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                     transition-all duration-300 ease-in-out
                     group"
            aria-label="Další produkty"
          >
            <svg 
              className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default ProductCarousel;
