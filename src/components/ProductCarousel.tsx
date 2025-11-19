import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  // Grid fallback pro ≤3 produkty
  if (products.length <= 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

  // ============================================================================
  // INFINITE LOOP: Klonování produktů
  // ============================================================================
  // Struktura: [...KlonovanéPoložkyKonec, ...OriginálníPoložky, ...KlonovanéPoložkyZačátek]
  // Klony na začátku = konec originálů (pro swipe doleva)
  // Klony na konci = začátek originálů (pro swipe doprava)
  // Počet klonů: alespoň 2 sady produktů na každou stranu (2 * products.length)
  const CLONE_COUNT = 2 * products.length;
  const clonedProducts = useMemo(() => [
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products), // Klony konce (na začátku)
    ...products, // Originální produkty
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products), // Klony začátku (na konci)
  ], [products]);

  // ============================================================================
  // REFS A STATE
  // ============================================================================
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [currentIndex, setCurrentIndex] = useState(CLONE_COUNT * products.length);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [gap, setGap] = useState(16); // Fixní gap 16px podle specifikace
  const [isDesktop, setIsDesktop] = useState(false);

  // ============================================================================
  // MĚŘENÍ ROZMĚRŮ A RESPONZIVITA
  // ============================================================================
  useEffect(() => {
    if (!viewportRef.current) return;

    const updateDimensions = () => {
      if (!viewportRef.current) return;
      
      const viewportWidth = viewportRef.current.offsetWidth;
      const desktop = viewportWidth >= 1024; // Breakpoint podle specifikace
      setIsDesktop(desktop);
      
      if (desktop) {
        // Desktop (>= 1024px): 5 karet (3 hlavní + 2 boční) + 4 gapy (16px)
        // cardWidth = (viewportWidth - 4 * 16) / 5
        const calculatedCardWidth = (viewportWidth - (4 * gap)) / 5;
        setCardWidth(calculatedCardWidth);
      } else {
        // Mobil (< 768px) nebo Tablet (768-1023px): 1 hlavní karta
        // cardWidth = viewportWidth - 32px (16px gap na každé straně pro peek)
        const calculatedCardWidth = viewportWidth - 32;
        setCardWidth(calculatedCardWidth);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [gap]);

  // ============================================================================
  // INFINITE LOOP RESET
  // ============================================================================
  // Reset pozice když jsme v klonované oblasti - bezviditelný skok na originály
  const handleTransitionEnd = useCallback(() => {
    if (isDragging || cardWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = CLONE_COUNT * totalProducts;
    const endOfOriginals = startOfOriginals + totalProducts - 1;

    // Pokud jsme na konci klonů vpravo, skočíme na začátek originálů
    if (currentIndex >= endOfOriginals + totalProducts) {
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentIndex(startOfOriginals);
      });
    }
    // Pokud jsme na začátku klonů vlevo, skočíme na konec originálů
    else if (currentIndex < startOfOriginals - totalProducts) {
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentIndex(endOfOriginals);
      });
    }
  }, [currentIndex, products.length, isDragging, cardWidth]);

  // Také kontrolujeme při změně indexu (pro případy bez transition)
  useEffect(() => {
    if (isTransitioning || isDragging || cardWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = CLONE_COUNT * totalProducts;
    const endOfOriginals = startOfOriginals + totalProducts - 1;

    if (currentIndex >= endOfOriginals + totalProducts) {
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentIndex(startOfOriginals);
      });
    } else if (currentIndex < startOfOriginals - totalProducts) {
      setIsTransitioning(false);
      requestAnimationFrame(() => {
        setCurrentIndex(endOfOriginals);
      });
    }
  }, [currentIndex, products.length, isTransitioning, isDragging, cardWidth]);

  // ============================================================================
  // NAVIGACE
  // ============================================================================
  const goToIndex = useCallback((newIndex: number, withTransition = true) => {
    if (isTransitioning && !isDragging) return;
    
    setIsTransitioning(withTransition);
    setCurrentIndex(newIndex);
    
    if (withTransition) {
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [isTransitioning, isDragging]);

  const nextSlide = useCallback(() => {
    if (!viewportRef.current) return;
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const desktop = viewportWidth >= 1024;
    
    // Desktop (>= 1024px): posun o 3 produkty
    // Mobil (< 768px): posun o 1 produkt
    const step = desktop ? 3 : 1;
    goToIndex(currentIndex + step);
  }, [currentIndex, goToIndex]);

  const prevSlide = useCallback(() => {
    if (!viewportRef.current) return;
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const desktop = viewportWidth >= 1024;
    
    // Desktop (>= 1024px): posun o 3 produkty
    // Mobil (< 768px): posun o 1 produkt
    const step = desktop ? 3 : 1;
    goToIndex(currentIndex - step);
  }, [currentIndex, goToIndex]);

  // ============================================================================
  // SWIPE/DRAG HANDLING
  // ============================================================================
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragStartTime(Date.now());
    setDragStartIndex(currentIndex);
    setDragOffset(0);
    setIsTransitioning(false);
  }, [currentIndex]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStart;
    setDragOffset(offset);
  }, [isDragging, dragStart]);

  const handleEnd = useCallback(() => {
    if (!isDragging || cardWidth === 0 || !viewportRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const desktop = viewportWidth >= 1024;
    const dragDuration = Date.now() - dragStartTime;
    const dragDistance = Math.abs(dragOffset);
    const dragVelocity = dragDistance / Math.max(dragDuration, 1); // px/ms
    
    // Threshold pro přepnutí
    const distanceThreshold = cardWidth * 0.3;
    const velocityThreshold = 0.5;
    
    // Vypočítáme, kolik karet bychom měli posunout
    const cardStep = cardWidth + gap;
    const cardsMoved = dragOffset / cardStep;
    
    // Rozhodneme, zda se máme snapnout nebo vrátit
    const shouldReturn = Math.abs(cardsMoved) < 0.3 && dragVelocity < velocityThreshold;
    
    let targetIndex: number;
    
    if (shouldReturn) {
      targetIndex = dragStartIndex;
    } else {
      const rawIndex = dragStartIndex + cardsMoved;
      targetIndex = Math.round(rawIndex);
    }
    
    goToIndex(targetIndex, true);
    setIsDragging(false);
    
    setTimeout(() => {
      setDragOffset(0);
    }, 600);
  }, [isDragging, dragOffset, dragStartIndex, cardWidth, gap, dragStartTime, goToIndex]);

  // Touch events
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

  // Mouse events
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

  // Global mouse events pro drag mimo komponentu
  useEffect(() => {
    if (!isDragging) return;

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
  }, [isDragging, handleMove, handleEnd]);

  // ============================================================================
  // VÝPOČET TRANSFORM POZICE
  // ============================================================================
  // Během dragu používáme dragStartIndex, jinak currentIndex
  // translateX = -baseIndex * cardStep + centerOffset + dragOffset
  const calculateTransform = () => {
    if (cardWidth === 0 || !viewportRef.current) return 'translateX(0)';
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const cardStep = cardWidth + gap;
    
    // Během dragu používáme dragStartIndex pro plynulý pohyb 1:1
    const baseIndex = isDragging ? dragStartIndex : currentIndex;
    
    // Centrovací offset
    // Chceme, aby karta na pozici 0 (relativně k baseIndex) byla uprostřed viewportu
    let centerOffset: number;
    if (isDesktop) {
      // Desktop: centrujeme prostřední hlavní produkt (pozice 0) z 5 karet
      // Struktura: pozice -2 (boční vlevo), -1, 0, 1 (hlavní), 2 (boční vpravo)
      // Pozice 0 je 2 kroky od začátku viditelné části (pozice -2, -1, 0)
      // Uprostřed viewportu = viewportWidth / 2
      // Karta na pozici 0 má být uprostřed, takže:
      // centerOffset = (viewportWidth / 2) - (cardWidth / 2) - (2 * cardStep)
      centerOffset = (viewportWidth / 2) - (cardWidth / 2) - (2 * cardStep);
    } else {
      // Mobil: centrujeme hlavní produkt (pozice 0)
      // Karta na pozici 0 má být uprostřed viewportu
      centerOffset = (viewportWidth / 2) - (cardWidth / 2);
    }
    
    // Finální offset
    // baseIndex * cardStep je pozice karty v tracku
    // Chceme, aby karta na pozici 0 (relativně k baseIndex) byla na pozici centerOffset
    // finalOffset = -baseIndex * cardStep + centerOffset + dragOffset
    const finalOffset = -baseIndex * cardStep + centerOffset + dragOffset;
    
    return `translateX(${finalOffset}px)`;
  };

  // ============================================================================
  // URČENÍ STYLU KARTY
  // ============================================================================
  const getCardStyle = (index: number) => {
    if (cardWidth === 0) {
      return {
        width: '0px',
        opacity: 0,
        transform: 'scale(0.85)',
      };
    }

    // Během dragu používáme dragStartIndex, jinak currentIndex
    const baseIndex = isDragging ? dragStartIndex : currentIndex;
    const position = index - baseIndex;
    
    if (isDesktop) {
      // Desktop: struktura 3 hlavní + 2 boční produkty
      if (position === -2) {
        // Boční produkt vlevo
        return {
          width: `${cardWidth}px`,
          opacity: 0.5,
          transform: 'scale(0.85)',
          transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
        };
      } else if (position >= -1 && position <= 1) {
        // Hlavní produkty (3 uprostřed)
        return {
          width: `${cardWidth}px`,
          opacity: 1,
          transform: 'scale(1)',
          transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
        };
      } else if (position === 2) {
        // Boční produkt vpravo
        return {
          width: `${cardWidth}px`,
          opacity: 0.5,
          transform: 'scale(0.85)',
          transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
        };
      } else {
        // Mimo hlavní strukturu - viditelné s nižší opacity pro swipe efekt
        const distance = Math.abs(position) - 2;
        return {
          width: `${cardWidth}px`,
          opacity: Math.max(0, 0.3 - distance * 0.1),
          transform: `scale(${Math.max(0.7, 0.85 - distance * 0.05)})`,
          transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
        };
      }
    } else {
      // Mobil: hlavní je na pozici 0
      const isMain = position === 0;
      const distance = Math.abs(position);
      
      return {
        width: `${cardWidth}px`,
        opacity: isMain ? 1 : Math.max(0, 0.3 - (distance - 1) * 0.1),
        transform: isMain ? 'scale(1)' : `scale(${Math.max(0.7, 0.9 - (distance - 1) * 0.1)})`,
        transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
      };
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div 
      ref={wrapperRef}
      className="relative w-full"
      style={{
        // Desktop: overflow-x visible pro boční produkty, mobil: hidden
        overflowX: isDesktop ? 'visible' : 'hidden',
        overflowY: 'hidden',
      }}
    >
      {/* Carousel Viewport - skryje části mimo viditelnou oblast */}
      <div
        ref={viewportRef}
        className="relative w-full"
        style={{
          overflow: 'hidden',
          touchAction: 'pan-x',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Carousel Track */}
        <div
          ref={trackRef}
          className="flex flex-row flex-nowrap"
          style={{
            gap: `${gap}px`,
            transform: calculateTransform(),
            transition: isTransitioning && !isDragging ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            willChange: isDragging ? 'transform' : 'auto',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {clonedProducts.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="flex-shrink-0"
              style={getCardStyle(index)}
            >
              <Link 
                to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                className="group cursor-pointer block h-full"
                draggable={false}
              >
                <div className="transition-transform duration-300 ease-in-out hover:scale-105 h-full">
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
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 -translate-y-1/2 left-2 md:left-4 lg:-left-12 z-30
                   w-10 h-10 md:w-12 md:h-12 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
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
        className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 lg:-right-12 z-30
                   w-10 h-10 md:w-12 md:h-12 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
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
