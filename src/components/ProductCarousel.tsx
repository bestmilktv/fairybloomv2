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

  // Infinite loop: klonujeme produkty na začátek a konec
  // Struktura: [...KlonovanéPoložkyKonec, ...OriginálníPoložky, ...KlonovanéPoložkyZačátek]
  // Klony na začátku = konec originálů (pro swipe doleva)
  // Klony na konci = začátek originálů (pro swipe doprava)
  // CLONE_COUNT = max(3, visibleItems + buffer)
  // Desktop: 5 viditelných + 2 buffer = 7
  // Mobil: 1 viditelný + 2 buffer = 3
  const [cloneCount, setCloneCount] = useState(3);
  
  // Vypočítáme cloneCount na základě velikosti kontejneru
  const calculateCloneCount = useCallback((containerWidth: number) => {
    const visibleItems = containerWidth >= 768 ? 5 : 1;
    const buffer = 2;
    return Math.max(3, visibleItems + buffer);
  }, []);

  // Vytvoříme clonedProducts pole - přepočítá se při změně cloneCount
  const clonedProducts = useMemo(() => [
    ...Array(cloneCount).fill(null).flatMap(() => products), // Klony konce (na začátku)
    ...products, // Originální produkty
    ...Array(cloneCount).fill(null).flatMap(() => products), // Klony začátku (na konci)
  ], [cloneCount, products]);

  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // currentIndex se inicializuje později, když známe cloneCount
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  
  // Inicializace currentIndex na začátek originálů po prvním výpočtu cloneCount
  useEffect(() => {
    if (cloneCount > 0 && currentIndex === null) {
      setCurrentIndex(cloneCount * products.length);
    }
  }, [cloneCount, products.length, currentIndex]);
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
      
      // Aktualizace cloneCount podle velikosti
      const newCloneCount = calculateCloneCount(containerWidth);
      setCloneCount(newCloneCount);
      
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
  }, [calculateCloneCount]);

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
  // 3. Reset se provádí po dokončení transition (onTransitionEnd) nebo okamžitě pokud není transition
  //
  // 4. Reset se provádí pouze když není aktivní drag, aby nedošlo k konfliktu s uživatelským vstupem.
  const handleTransitionEnd = useCallback(() => {
    if (isDragging || cardWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = cloneCount * totalProducts;
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
  }, [currentIndex, products.length, isDragging, cardWidth, cloneCount]);

  // Také kontrolujeme při změně indexu (pro případy bez transition)
  useEffect(() => {
    if (isTransitioning || isDragging || cardWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = cloneCount * totalProducts;
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
  }, [currentIndex, products.length, isTransitioning, isDragging, cardWidth, cloneCount]);

  // Navigace
  const goToIndex = useCallback((newIndex: number, withTransition = true) => {
    // Povolíme navigaci i během transition, pokud je to drag
    if (isTransitioning && !isDragging) return;
    if (currentIndex === null) return; // Čekáme na inicializaci
    
    setIsTransitioning(withTransition);
    setCurrentIndex(newIndex);
    
    if (withTransition) {
      // Timeout musí být delší než transition duration (500ms)
      setTimeout(() => setIsTransitioning(false), 600);
    }
  }, [isTransitioning, isDragging, currentIndex]);

  const nextSlide = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const isMobile = containerWidth < 768;
    
    // Desktop: posun o 3 produkty, Mobil: posun o 1 produkt
    const step = isMobile ? 1 : 3;
    goToIndex(currentIndex + step);
  }, [currentIndex, goToIndex]);

  const prevSlide = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const isMobile = containerWidth < 768;
    
    // Desktop: posun o 3 produkty, Mobil: posun o 1 produkt
    const step = isMobile ? 1 : 3;
    goToIndex(currentIndex - step);
  }, [currentIndex, goToIndex]);

  // Swipe/Drag handling
  const handleStart = useCallback((clientX: number) => {
    if (currentIndex === null) return; // Čekáme na inicializaci
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
    if (!isDragging || cardWidth === 0 || !containerRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const containerWidth = containerRef.current.offsetWidth;
    const isMobile = containerWidth < 768;
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
    const cardsMoved = dragOffset / cardStep;
    
    // Rozhodneme, zda se máme snapnout nebo vrátit na původní pozici
    // Pokud swipe nebyl dostatečný (malá vzdálenost a malá rychlost), vrátíme se
    const shouldReturn = Math.abs(cardsMoved) < 0.3 && dragVelocity < velocityThreshold;
    
    let targetIndex: number;
    
    if (shouldReturn) {
      // Vrátíme se na původní pozici
      targetIndex = dragStartIndex;
    } else {
      // Snapneme na nejbližší celý produkt
      // Vypočítáme target index na základě cardsMoved a zaokrouhlíme
      const rawIndex = dragStartIndex + cardsMoved;
      
      if (isMobile) {
        // Mobil: snap na každý produkt (zaokrouhlíme na nejbližší celé číslo)
        targetIndex = Math.round(rawIndex);
      } else {
        // Desktop: snap na každý produkt (zaokrouhlíme na nejbližší celé číslo)
        // V budoucnu můžeme změnit na snap na násobky 3, pokud chceme posunout o 3 produkty najednou
        targetIndex = Math.round(rawIndex);
      }
    }
    
    // Zajistíme, že targetIndex je v rozsahu originálů (infinite loop reset se postará o klony)
    goToIndex(targetIndex, true);
    
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

  // Výpočet transform pozice - zjednodušený výpočet
  // Během dragu používáme dragStartIndex, jinak currentIndex
  // translateX = -baseIndex * cardStep + centerOffset + dragOffset
  // cardStep = cardWidth + gap
  // centerOffset = (containerWidth / 2) - (cardWidth / 2) pro mobil
  // centerOffset = (containerWidth / 2) - (2.5 * cardWidth + 2 * gap) pro desktop (centrujeme prostřední z 5 karet)
  const calculateTransform = () => {
    if (cardWidth === 0 || !containerRef.current || currentIndex === null) return 'translateX(0)';
    
    const containerWidth = containerRef.current.offsetWidth;
    const isMobile = containerWidth < 768;
    const cardStep = cardWidth + gap;
    
    // Během dragu používáme dragStartIndex, jinak currentIndex
    // Tím zajistíme, že carousel se pohybuje přesně 1:1 s prstem/myší
    const baseIndex = isDragging ? dragStartIndex : currentIndex;
    const baseOffset = baseIndex * cardStep;
    
    // Centrovací offset
    let centerOffset: number;
    if (isMobile) {
      // Mobil: centrujeme hlavní produkt (1 karta)
      centerOffset = (containerWidth / 2) - (cardWidth / 2);
    } else {
      // Desktop: centrujeme prostřední hlavní produkt z 5 karet (index 2 z 5)
      // Viditelná část: 5 karet, prostřední je na pozici 2
      centerOffset = (containerWidth / 2) - (2.5 * cardWidth + 2 * gap);
    }
    
    // Finální offset: posuneme track doleva o baseOffset, pak centrujeme, pak přidáme dragOffset
    const finalOffset = -baseOffset + centerOffset + dragOffset;
    
    return `translateX(${finalOffset}px)`;
  };

  // Určení stylu karty - všechny karty jsou viditelné, pouze měníme opacity a scale
  const getCardStyle = (index: number) => {
    if (cardWidth === 0 || !containerRef.current || currentIndex === null) {
      return {
        width: `${cardWidth}px`,
        opacity: 0,
        transform: 'scale(0.85)',
      };
    }

    const position = index - currentIndex;
    const isMobile = containerRef.current.offsetWidth < 768;
    
    if (isMobile) {
      // Mobil: hlavní je na pozici 0, peek na -1 a 1
      const isMain = position === 0;
      const distance = Math.abs(position);
      
      // Všechny karty jsou viditelné, ale měníme opacity a scale podle vzdálenosti
      return {
        width: `${cardWidth}px`,
        opacity: isMain ? 1 : Math.max(0, 0.3 - (distance - 1) * 0.1),
        transform: isMain ? 'scale(1)' : `scale(${Math.max(0.7, 0.9 - (distance - 1) * 0.1)})`,
        transition: isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none',
      };
    } else {
      // Desktop: hlavní jsou na pozicích -1, 0, 1; boční na -2 a 2
      const isMain = Math.abs(position) <= 1;
      const distance = Math.abs(position);
      
      // Všechny karty jsou viditelné, ale měníme opacity a scale podle vzdálenosti
      return {
        width: `${cardWidth}px`,
        opacity: isMain ? 1 : Math.max(0, 0.5 - (distance - 2) * 0.1),
        transform: isMain ? 'scale(1)' : `scale(${Math.max(0.7, 0.85 - (distance - 2) * 0.05)})`,
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
        className="flex flex-row flex-nowrap"
        style={{
          gap: `${gap}px`,
          transform: calculateTransform(),
          // Během dragu: žádná transition (carousel se pohybuje 1:1 s prstem/myší)
          // Po uvolnění: plynulá transition na finální pozici
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
