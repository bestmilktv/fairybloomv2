import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
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
  // ============================================================================
  // FALLBACK PRO MÁLO PRODUKTŮ
  // ============================================================================
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
  // KONFIGURACE
  // ============================================================================
  const GAP = 16;
  const ANIMATION_DURATION = 500;

  // Buffer: Zajistíme dostatek klonů, aby se nedalo dojet na konec během jednoho tahu.
  // Min 10 klonů na každou stranu, nebo 4 sady produktů.
  const CLONE_COUNT = Math.max(10, products.length * 4);

  // Příprava dat
  const allSlides = useMemo(() => {
    const items = [];
    // A) Klony vlevo
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = (products.length - 1 - (i % products.length));
        items.unshift({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }
    // B) Originály
    products.forEach((p, i) => {
        items.push({ product: p, isClone: false, originalIndex: i });
    });
    // C) Klony vpravo
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = i % products.length;
        items.push({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }
    return items;
  }, [products, CLONE_COUNT]);

  const START_INDEX = CLONE_COUNT;
  // Definujeme bezpečnou zónu. Pokud vyjedeme ven, při dalším dotyku resetujeme.
  const SAFE_ZONE_START = CLONE_COUNT - products.length;
  const SAFE_ZONE_END = CLONE_COUNT + (products.length * 2);

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX);
  
  // REF PRO OCHRANU KLIKNUTÍ
  const isClickBlockedRef = useRef(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rozměry
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // ============================================================================
  // RESPONZIVITA
  // ============================================================================
  useEffect(() => {
    if (!wrapperRef.current) return;
    const updateDimensions = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.offsetWidth;
      setViewportWidth(width);
      const desktop = width >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setCardWidth((width - (4 * GAP)) / 5);
      } else {
        setCardWidth(width - 32);
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const getPositionForIndex = useCallback((index: number) => {
    if (cardWidth === 0) return 0;
    const totalCardWidth = cardWidth + GAP;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    return -(index * totalCardWidth) + centerOffset;
  }, [cardWidth, viewportWidth]);

  // ============================================================================
  // VISUAL UPDATE ENGINE
  // ============================================================================
  const updateVisuals = useCallback((instant = false, overrideIndex?: number) => {
    if (!trackRef.current || cardWidth === 0) return;

    const targetIndex = overrideIndex !== undefined ? overrideIndex : currentIndexRef.current;
    const currentDrag = dragOffsetRef.current;
    const totalCardWidth = cardWidth + GAP;
    const viewportCenter = viewportWidth / 2;

    const basePos = getPositionForIndex(targetIndex);
    const finalPos = basePos + currentDrag;
    
    trackRef.current.style.transform = `translate3d(${finalPos}px, 0, 0)`;
    trackRef.current.style.transition = (isDraggingRef.current || instant) 
        ? 'none' 
        : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;

    // Optimalizace: Renderujeme jen viditelné + buffer
    const visibleCount = Math.ceil(viewportWidth / totalCardWidth) + 2;
    const startIndex = Math.max(0, targetIndex - visibleCount);
    const endIndex = Math.min(allSlides.length - 1, targetIndex + visibleCount);

    for (let i = startIndex; i <= endIndex; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;

        const cardTrackPos = finalPos + (i * totalCardWidth); 
        const cardCenter = cardTrackPos + (cardWidth / 2);
        const dist = Math.abs(viewportCenter - cardCenter);

        let scale = 1;
        let opacity = 1;

        if (isDesktop) {
            const mainZone = totalCardWidth * 1.5; 
            if (dist > mainZone) {
                const factor = Math.min(1, (dist - mainZone) / totalCardWidth);
                scale = 1 - (factor * 0.15);
                opacity = 1 - (factor * 0.5);
            }
        } else {
            const mainZone = totalCardWidth * 0.5;
            if (dist > mainZone) {
                 const factor = Math.min(1, (dist - mainZone) / totalCardWidth);
                 scale = 1 - (factor * 0.15);
                 opacity = 1 - (factor * 0.5);
            }
        }

        card.style.width = `${cardWidth}px`;
        card.style.transform = `scale(${scale}) translateZ(0)`;
        card.style.opacity = `${opacity}`;
        card.style.transition = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`;
    }

  }, [cardWidth, isDesktop, viewportWidth, getPositionForIndex, allSlides.length]);

  useLayoutEffect(() => {
    updateVisuals(isResettingRef.current);
  }, [updateVisuals, currentIndex]); 

  // ============================================================================
  // GLOBAL LISTENERS
  // ============================================================================
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const diff = clientX - dragStartX.current;
        dragOffsetRef.current = diff;
        
        if (Math.abs(diff) > 5) {
            isClickBlockedRef.current = true;
        }
        
        updateVisuals(true); // 3. param = update visuals for drag
        // Force update state for dragOffset to trigger potential renders if needed, 
        // but mostly visual updates are handled via refs.
        setDragOffset(diff); 
    };

    const handleGlobalUp = () => {
        if (!isDraggingRef.current) return;
        stopDrag();
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('touchmove', handleGlobalMove, { passive: false });
        window.addEventListener('mouseup', handleGlobalUp);
        window.addEventListener('touchend', handleGlobalUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isDragging, updateVisuals]);

  // ============================================================================
  // LOGIKA DRAG & TELEPORT NA ZAČÁTKU
  // ============================================================================
  
  // Tato funkce zkontroluje, zda nejsme nebezpečně blízko kraje.
  // Pokud ano, OKAMŽITĚ (před dragem) nás přesune do středu.
  const checkBoundsAndTeleport = () => {
      const current = currentIndexRef.current;
      
      // Pokud jsme mimo bezpečnou zónu
      if (current < SAFE_ZONE_START || current > SAFE_ZONE_END) {
          const slideData = allSlides[current];
          if (!slideData) return;

          // Najdeme odpovídající index v "hlavní" sadě originálů (uprostřed pole)
          const targetIndex = START_INDEX + slideData.originalIndex;
          
          // Okamžitý posun
          currentIndexRef.current = targetIndex;
          setCurrentIndex(targetIndex);
          
          if (trackRef.current) {
              trackRef.current.style.transition = 'none';
              const newPos = getPositionForIndex(targetIndex);
              trackRef.current.style.transform = `translate3d(${newPos}px, 0, 0)`;
              // Force reflow
              void trackRef.current.offsetHeight;
          }
          
          // Aktualizace vizuálu pro novou pozici
          updateVisuals(true, targetIndex);
      }
  };

  const startDrag = (clientX: number) => {
    if (isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // 1. ZKONTROLOVAT HRANICE A TELEPORTOVAT (Tohle je ten fix)
    checkBoundsAndTeleport();

    // 2. START DRAG
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = clientX;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    isClickBlockedRef.current = false;
    
    setIsTransitioning(false);
    
    if (trackRef.current) {
        trackRef.current.style.transition = 'none';
    }
    updateVisuals(true); 
  };

  const stopDrag = () => {
    setIsDragging(false);
    isDraggingRef.current = false;

    const currentOffset = dragOffsetRef.current;
    const totalCardWidth = cardWidth + GAP;
    const movedCards = -currentOffset / totalCardWidth;
    let indexDiff = Math.round(movedCards);

    if (Math.abs(movedCards) > 0.1 && Math.abs(currentOffset) > 50) {
        if (movedCards > 0 && indexDiff === 0) indexDiff = 1;
        if (movedCards < 0 && indexDiff === 0) indexDiff = -1;
    }

    const newIndex = currentIndexRef.current + indexDiff;
    
    setIsTransitioning(true);
    dragOffsetRef.current = 0; 
    setDragOffset(0);

    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  };

  // ============================================================================
  // RESET LOGIC (Backup po animaci)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDragging) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setIsTransitioning(false);

    // Zde už nemusíme dělat agresivní reset, protože to děláme při startDrag.
    // Ale pro jistotu můžeme zkontrolovat, jestli jsme extrémně daleko.
  };

  const moveSlide = (step: number) => {
      if (isTransitioning) return;
      
      // I u šipek zkontrolujeme bounds před pohybem
      checkBoundsAndTeleport();
      
      // Malý timeout, aby se stihl projevit teleport, pokud nastal
      requestAnimationFrame(() => {
          setIsTransitioning(true);
          currentIndexRef.current += step;
          setCurrentIndex(currentIndexRef.current);
          
          if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = setTimeout(() => {
              setIsTransitioning(false);
          }, ANIMATION_DURATION + 50);
      });
  };

  // ============================================================================
  // JSX
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden select-none touch-none group">
      <style>{`
        .carousel-force-no-animate * {
          animation: none !important;
        }
        .carousel-force-no-animate img {
          transform: translateZ(0) !important;
          /* will-change odstraněno pro bezpečí paměti */
          backface-visibility: hidden;
        }
      `}</style>

      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
        onTouchStart={(e) => { startDrag(e.touches[0].clientX); }}
      >
        <div
            ref={trackRef}
            className="flex flex-row carousel-force-no-animate"
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                willChange: 'transform',
                backfaceVisibility: 'hidden'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            {allSlides.map((item, i) => {
                const uniqueKey = `${item.isClone ? 'clone' : 'orig'}-${item.product.id}-${i}`;
                return (
                    <div 
                        key={uniqueKey}
                        ref={el => cardRefs.current[i] = el}
                        className="flex-shrink-0"
                        style={{
                            width: `${cardWidth}px`,
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <div className="h-full"> 
                            <Link 
                                to={item.product.handle ? createProductPath(item.product.handle) : `/product-shopify/${item.product.handle}`}
                                className="block h-full"
                                draggable={false}
                                onClick={(e) => {
                                    if (isClickBlockedRef.current) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                            >
                                <ProductCard
                                    id={item.product.id}
                                    title={item.product.title}
                                    price={item.product.price}
                                    image={item.product.image}
                                    description={item.product.description}
                                    inventoryQuantity={item.product.inventoryQuantity}
                                    disableAnimations={true}
                                />
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Navigace */}
      <button onClick={() => moveSlide(-1)} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={() => moveSlide(1)} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default ProductCarousel;