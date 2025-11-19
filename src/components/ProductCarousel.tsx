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

  // Infinite loop: klonujeme produkty na začátek a konec
  // Klonujeme dostatečný počet pro plynulý infinite loop
  // Struktura: [klony] + [originály] + [klony]
  // Např. pro 5 produktů: [1,2,3,4,5, 1,2,3,4,5, 1,2,3,4,5] + [1,2,3,4,5] + [1,2,3,4,5, 1,2,3,4,5, 1,2,3,4,5]
  // Začínáme na začátku originálů (index = CLONE_COUNT * products.length)
  const CLONE_COUNT = 3;
  const clonedProducts = [
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products),
    ...products,
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products),
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(CLONE_COUNT * products.length);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [gap, setGap] = useState(0);

  // Měření šířky karty a gapu pomocí ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      
      // Desktop: 5 karet (3 hlavní + 2 boční) s gapy
      // Mobil: 1 hlavní karta
      if (containerWidth >= 768) {
        // Desktop: každá karta má ~18% šířky kontejneru (5 karet + 4 gapy = ~100%)
        // Gap je ~2% šířky kontejneru
        const calculatedGap = Math.max(16, containerWidth * 0.02); // Minimálně 16px
        const calculatedCardWidth = (containerWidth - (4 * calculatedGap)) / 5;
        setCardWidth(calculatedCardWidth);
        setGap(calculatedGap);
      } else {
        // Mobil: 1 karta s malým peek (90% šířky, 5% gap na každé straně)
        const calculatedCardWidth = containerWidth * 0.9;
        const calculatedGap = Math.max(8, containerWidth * 0.05); // Minimálně 8px
        setCardWidth(calculatedCardWidth);
        setGap(calculatedGap);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Infinite loop reset: když jsme na klonu, skočíme na originál bez transition
  // 
  // LOGIKA RESETU:
  // 1. Když uživatel dojde na konec klonů vpravo (index >= endOfOriginals + totalProducts),
  //    okamžitě (bez transition) skočíme na začátek originálů (startOfOriginals).
  //    Protože jsou klony identické s originály, uživatel nevidí žádný skok.
  //
  // 2. Když uživatel dojde na začátek klonů vlevo (index < startOfOriginals - totalProducts),
  //    okamžitě skočíme na konec originálů (endOfOriginals).
  //
  // 3. Používáme requestAnimationFrame, aby se reset provedl v dalším render cyklu,
  //    což zajišťuje, že transition je vypnutá a reset je bezviditelný.
  //
  // 4. Reset se provádí pouze když není aktivní transition ani drag,
  //    aby nedošlo k konfliktu s uživatelským vstupem.
  useEffect(() => {
    if (isTransitioning || isDragging || cardWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = CLONE_COUNT * totalProducts;
    const endOfOriginals = startOfOriginals + totalProducts - 1;

    // Pokud jsme na konci klonů vpravo, skočíme na začátek originálů
    if (currentIndex >= endOfOriginals + totalProducts) {
      // Vypneme transition pro bezviditelný skok
      setIsTransitioning(false);
      // Použijeme requestAnimationFrame pro okamžitý reset bez viditelného skoku
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
  }, [currentIndex, products.length, isTransitioning, isDragging, cardWidth]);

  // Navigace
  const goToIndex = useCallback((newIndex: number, withTransition = true) => {
    // Povolíme navigaci i během transition, pokud je to drag
    if (isTransitioning && !isDragging) return;
    
    setIsTransitioning(withTransition);
    setCurrentIndex(newIndex);
    
    if (withTransition) {
      // Timeout musí být delší než transition duration (500ms)
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [isTransitioning, isDragging]);

  const nextSlide = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const prevSlide = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  // Swipe/Drag handling
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
    if (!isDragging || cardWidth === 0) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const dragDuration = Date.now() - dragStartTime;
    const dragDistance = Math.abs(dragOffset);
    const dragVelocity = dragDistance / Math.max(dragDuration, 1); // px/ms
    
    // Threshold pro přepnutí: buď 30% šířky karty, nebo rychlý swipe (velocity > 0.5 px/ms)
    const distanceThreshold = cardWidth * 0.3;
    const velocityThreshold = 0.5;
    
    // Vypočítáme, kolik karet bychom měli posunout na základě vzdálenosti
    // dragOffset > 0 znamená tažení doprava → chceme vidět produkty vpravo → zvýšit index
    // dragOffset < 0 znamená tažení doleva → chceme vidět produkty vlevo → snížit index
    const cardStep = cardWidth + gap;
    const cardsMoved = Math.round(dragOffset / cardStep);
    
    // Pokud je swipe dostatečně rychlý nebo daleký, posuneme se
    // Nebo pokud jsme posunuli alespoň o jednu kartu
    const shouldSnap = dragDistance > distanceThreshold || dragVelocity > velocityThreshold || Math.abs(cardsMoved) >= 1;
    
    if (shouldSnap && cardsMoved !== 0) {
      // Posuneme se o vypočítaný počet karet
      // cardsMoved > 0 při tažení doprava → zvýšíme index (více produktů vpravo)
      // cardsMoved < 0 při tažení doleva → snížíme index (více produktů vlevo)
      const newIndex = dragStartIndex + cardsMoved;
      goToIndex(newIndex, true);
    } else {
      // Vrátíme se na původní pozici s plynulou animací
      goToIndex(dragStartIndex, true);
    }
    
    setIsDragging(false);
    // Reset dragOffset až po dokončení transition
    setTimeout(() => {
      setDragOffset(0);
    }, 600); // Čekáme na dokončení transition (500ms + rezerva)
  }, [isDragging, dragOffset, dragStartIndex, cardWidth, gap, dragStartTime, goToIndex]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Prevent default scrolling při swipe
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

  // Výpočet transform pozice
  // Používáme jednoduchý výpočet: currentIndex * cardWidth pro posun
  // Centrujeme pomocí 50% kontejneru mínus polovina šířky viditelné části
  const calculateTransform = () => {
    if (cardWidth === 0 || !containerRef.current) return 'translateX(0)';
    
    const containerWidth = containerRef.current.offsetWidth;
    const isMobile = containerWidth < 768;
    
    if (isMobile) {
      // Mobil: centrujeme hlavní produkt (index 0 z viditelných)
      // Viditelná část: 1 karta uprostřed
      const baseOffset = currentIndex * (cardWidth + gap);
      const centerOffset = (containerWidth / 2) - (cardWidth / 2);
      const finalOffset = -baseOffset + centerOffset + dragOffset;
      return `translateX(${finalOffset}px)`;
    } else {
      // Desktop: centrujeme 3 hlavní produkty uprostřed
      // Viditelná část: 1 boční vlevo + 3 hlavní + 1 boční vpravo = 5 karet
      // Centrujeme prostřední hlavní produkt (index 2 z 5)
      const baseOffset = currentIndex * (cardWidth + gap);
      const visibleWidth = 5 * cardWidth + 4 * gap; // 5 karet + 4 gapy
      const centerOffset = (containerWidth / 2) - (visibleWidth / 2);
      // Upravíme offset tak, aby prostřední hlavní produkt (index 2) byl uprostřed
      const centerCardOffset = 2 * (cardWidth + gap); // Offset pro 3. kartu (index 2)
      const finalOffset = -baseOffset + centerOffset + centerCardOffset + dragOffset;
      return `translateX(${finalOffset}px)`;
    }
  };

  // Určení pozice karty relativně k centru
  // Desktop: zobrazujeme 5 karet (-2, -1, 0, 1, 2), kde 0 je prostřední hlavní
  // Mobil: zobrazujeme 3 karty (-1, 0, 1), kde 0 je hlavní
  const getCardPosition = (index: number) => {
    return index - currentIndex;
  };

  const getCardStyle = (index: number) => {
    if (cardWidth === 0 || !containerRef.current) {
      return {
        width: '0px',
        opacity: 0,
        transform: 'scale(0)',
        visibility: 'hidden' as const,
      };
    }

    const position = getCardPosition(index);
    const isMobile = containerRef.current.offsetWidth < 768;
    
    if (isMobile) {
      // Mobil: hlavní je na pozici 0, peek na -1 a 1
      const isMain = position === 0;
      const isVisible = Math.abs(position) <= 1;
      
      return {
        width: `${cardWidth}px`,
        opacity: isMain ? 1 : 0.3,
        transform: isMain ? 'scale(1)' : 'scale(0.9)',
        visibility: isVisible ? 'visible' as const : 'hidden' as const,
        transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
      };
    } else {
      // Desktop: hlavní jsou na pozicích -1, 0, 1; boční na -2 a 2
      // Celkem viditelných: 5 karet (-2 až 2)
      const isMain = Math.abs(position) <= 1;
      const isSide = Math.abs(position) === 2;
      const isVisible = Math.abs(position) <= 2;
      
      return {
        width: `${cardWidth}px`,
        opacity: isMain ? 1 : 0.5,
        transform: isMain ? 'scale(1)' : 'scale(0.85)',
        visibility: isVisible ? 'visible' as const : 'hidden' as const,
        transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
      };
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: 'pan-x' }}
    >
      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="flex"
        style={{
          gap: `${gap}px`,
          transform: calculateTransform(),
          transition: isTransitioning && !isDragging ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: isDragging ? 'transform' : 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
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
