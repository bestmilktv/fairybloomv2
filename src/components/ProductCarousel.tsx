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
  variantId?: string;
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
                variantId={product.variantId}
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
  const ANIMATION_DURATION = 1000;
  const LOCK_DURATION = 400;
  const EASING_CURVE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const BUFFER_SETS = products.length < 5 ? 10 : 4;
  const CLONE_COUNT = products.length * BUFFER_SETS;

  const allSlides = useMemo(() => {
    const items = [];
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = (products.length - 1 - (i % products.length));
        items.unshift({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }
    products.forEach((p, i) => {
        items.push({ product: p, isClone: false, originalIndex: i });
    });
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = i % products.length;
        items.push({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }
    return items;
  }, [products, CLONE_COUNT]);

  const START_INDEX = CLONE_COUNT;
  const SAFE_ZONE_START = CLONE_COUNT - products.length;
  const SAFE_ZONE_END = CLONE_COUNT + (products.length * 2);

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  
  // Refs
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isDraggingRef = useRef(false); 
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX);
  const isClickBlockedRef = useRef(false);
  
  // Pointer tracking
  const activePointerId = useRef<number | null>(null);
  const isScrollingRef = useRef(false); // True pokud uživatel scrolluje stránku vertikálně
  const isSwipingRef = useRef(false); // True pokud uživatel swipuje carousel horizontálně
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null); // Pro throttling updateVisuals pomocí RAF

  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // ============================================================================
  // RESPONZIVITA
  // ============================================================================
  useEffect(() => {
    if (!wrapperRef.current) return;
    const updateDimensions = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.offsetWidth;
      setViewportWidth(width);
      
      if (width >= 1024) {
        setLayoutMode('desktop');
        setCardWidth((width - (4 * GAP)) / 5);
      } else if (width >= 640) {
        setLayoutMode('tablet');
        setCardWidth((width - (2 * GAP)) / 3);
      } else {
        setLayoutMode('mobile');
        setCardWidth(width - 32);
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapperRef.current);
    return () => {
      resizeObserver.disconnect();
      // Cleanup RAF při unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
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
    const currentDrag = instant ? dragOffsetRef.current : 0; 
    
    const totalCardWidth = cardWidth + GAP;
    const viewportCenter = viewportWidth / 2;

    const basePos = getPositionForIndex(targetIndex);
    const finalPos = basePos + currentDrag;
    
    trackRef.current.style.transform = `translate3d(${finalPos}px, 0, 0)`;
    trackRef.current.style.transition = (isDraggingRef.current || instant) 
        ? 'none' 
        : `transform ${ANIMATION_DURATION}ms ${EASING_CURVE}`;

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

        if (layoutMode === 'desktop') {
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

        // Optimalizované batch DOM updates - používat jednotlivé properties místo cssText pro lepší kompatibilitu
        const transitionValue = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ${EASING_CURVE}, opacity ${ANIMATION_DURATION}ms ${EASING_CURVE}`;
        
        // Použít jednorázovou manipulaci pro lepší výkon
        if (card.style.width !== `${cardWidth}px`) card.style.width = `${cardWidth}px`;
        if (card.style.transform !== `scale(${scale}) translateZ(0)`) card.style.transform = `scale(${scale}) translateZ(0)`;
        if (card.style.opacity !== `${opacity}`) card.style.opacity = `${opacity}`;
        if (card.style.transition !== transitionValue) card.style.transition = transitionValue;
    }

  }, [cardWidth, layoutMode, viewportWidth, getPositionForIndex, allSlides.length]);

  useLayoutEffect(() => {
    // Optimalizace: update jen když je potřeba a cardWidth je nastaven
    if (cardWidth > 0 && !isResettingRef.current) {
      updateVisuals(isResettingRef.current);
    }
  }, [updateVisuals, currentIndex, cardWidth]);

  // ============================================================================
  // TRACKING CURRENT PRODUCT INDEX (pro indikátor pozice)
  // ============================================================================
  const getCurrentProductIndex = useCallback((index: number): number => {
    const slideData = allSlides[index];
    if (!slideData) return 0;
    return slideData.originalIndex;
  }, [allSlides]);

  useEffect(() => {
    const productIndex = getCurrentProductIndex(currentIndex);
    setCurrentProductIndex(productIndex);
  }, [currentIndex, getCurrentProductIndex]); 

  // ============================================================================
  // POINTER EVENTS LOGIC (DUAL MODE: MOUSE vs TOUCH)
  // ============================================================================
  
  const checkBoundsAndTeleport = () => {
      const current = currentIndexRef.current;
      if (current < SAFE_ZONE_START || current > SAFE_ZONE_END) {
          const slideData = allSlides[current];
          if (!slideData) return;

          const targetIndex = START_INDEX + slideData.originalIndex;
          currentIndexRef.current = targetIndex;
          setCurrentIndex(targetIndex);
          
          if (trackRef.current) {
              trackRef.current.style.transition = 'none';
              const newPos = getPositionForIndex(targetIndex);
              trackRef.current.style.transform = `translate3d(${newPos}px, 0, 0)`;
              void trackRef.current.offsetHeight;
          }
          updateVisuals(true, targetIndex);
      }
  };

  // --- POINTER DOWN ---
  const handlePointerDown = (e: React.PointerEvent) => {
      // Ignorujeme pravé tlačítko a pokud už něco táhneme
      if (e.button !== 0 || activePointerId.current !== null) return;

      // Uložíme ID pointeru
      activePointerId.current = e.pointerId;

      if (isResettingRef.current) return;
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

      checkBoundsAndTeleport();

      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragOffsetRef.current = 0;
      
      isClickBlockedRef.current = false;
      isDraggingRef.current = false;
      isScrollingRef.current = false; // Reset flagu pro vertikální scroll
      isSwipingRef.current = false; // Reset flagu pro horizontální swipe
      
      setIsTransitioning(false);
      
      if (trackRef.current) {
          trackRef.current.style.transition = 'none';
      }

      // DŮLEŽITÉ ROZLIŠENÍ:
      // Pokud je to MYŠ, okamžitě blokujeme default (aby se neoznačoval text/obrázky)
      // a okamžitě aktivujeme drag.
      if (e.pointerType === 'mouse') {
          e.preventDefault();
          isDraggingRef.current = true;
          setIsDragging(true);
          // Capture pointer hned pro myš
          const element = e.target as HTMLElement;
          element.setPointerCapture(e.pointerId);
      }
      // Pokud je to DOTYK, NEDĚLÁME preventDefault ani capture hned.
      // Čekáme na první pohyb, abychom zjistili, jestli to není scroll.
  };

  // --- POINTER MOVE ---
  const handlePointerMove = (e: React.PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;

      const diffX = e.clientX - dragStartX.current;
      const diffY = e.clientY - dragStartY.current;

      // --- LOGIKA PRO MYŠ ---
      if (e.pointerType === 'mouse') {
          // Pro myš okamžitě swipuj (stávající logika)
          if (!isDraggingRef.current) {
              isDraggingRef.current = true;
              setIsDragging(true);
          }
          
          dragOffsetRef.current = diffX;
          
          if (Math.abs(diffX) > 5) {
              isClickBlockedRef.current = true;
          }
          
          // Throttle pomocí RAF pro lepší výkon na mobilních zařízeních
          if (rafIdRef.current === null) {
              rafIdRef.current = requestAnimationFrame(() => {
                  updateVisuals(true);
                  rafIdRef.current = null;
              });
          }
          return;
      }

      // --- LOGIKA PRO DOTYK ---
      if (e.pointerType === 'touch') {
          // Pokud uživatel scrolluje stránku, OKAMŽITĚ RETURN
          if (isScrollingRef.current) {
              // Ujistíme se, že pointer capture je uvolněný a activePointerId je resetovaný
              const element = e.target as HTMLElement;
              try {
                  if (element.hasPointerCapture && element.hasPointerCapture(e.pointerId)) {
                      element.releasePointerCapture(e.pointerId);
                  }
              } catch(err) { /* ignore */ }
              activePointerId.current = null;
              return;
          }

          // Pokud už swipujeme, pokračuj ve swipování
          if (isSwipingRef.current) {
              if (e.cancelable) e.preventDefault();
              
              dragOffsetRef.current = diffX;
              
              if (Math.abs(diffX) > 5) {
                  isClickBlockedRef.current = true;
              }
              
              // Throttle pomocí RAF pro lepší výkon na mobilních zařízeních
              if (rafIdRef.current === null) {
                  rafIdRef.current = requestAnimationFrame(() => {
                      updateVisuals(true);
                      rafIdRef.current = null;
                  });
              }
              return;
          }

          // Pokud nevíme (první pohyb) - rozhodnutí o směru
          // Deadzone - ignoruj malé pohyby
          if (Math.abs(diffX) < 6 && Math.abs(diffY) < 6) return;

          // Rozhodnutí: Scroll vs Swipe
          if (Math.abs(diffY) > Math.abs(diffX)) {
              // Uživatel táhne vertikálně - scroll stránky
              // Uvolníme pointer capture (pokud ho máme) a resetujeme activePointerId
              const element = e.target as HTMLElement;
              try {
                  if (element.hasPointerCapture && element.hasPointerCapture(e.pointerId)) {
                      element.releasePointerCapture(e.pointerId);
                  }
              } catch(err) { /* ignore */ }
              
              activePointerId.current = null;
              isScrollingRef.current = true;
              // Nech událost projít (žádný preventDefault), ať prohlížeč scrolluje
              return;
          } else if (Math.abs(diffX) > 5) {
              // Uživatel táhne horizontálně - swipe carouselu
              isSwipingRef.current = true;
              isDraggingRef.current = true;
              setIsDragging(true);
              
              // Zavolej setPointerCapture a preventDefault
              const element = e.target as HTMLElement;
              element.setPointerCapture(e.pointerId);
              if (e.cancelable) e.preventDefault();
              
              // Začni hýbat carouselem
              dragOffsetRef.current = diffX;
              isClickBlockedRef.current = true;
              // Throttle pomocí RAF pro lepší výkon na mobilních zařízeních
              if (rafIdRef.current === null) {
                  rafIdRef.current = requestAnimationFrame(() => {
                      updateVisuals(true);
                      rafIdRef.current = null;
                  });
              }
          }
      }
  };

  // --- POINTER UP / CANCEL / LEAVE ---
  const handlePointerUp = (e: React.PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      
      // Zrušit pending RAF update
      if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
      }
      
      // Uvolníme capture pokud ho máme
      if (isDraggingRef.current) {
          const element = e.target as HTMLElement;
          try {
            if (element.hasPointerCapture(e.pointerId)) {
                element.releasePointerCapture(e.pointerId);
            }
          } catch(err) { /* ignore */ }
          stopDrag();
      }

      // Reset všeho
      activePointerId.current = null;
      isDraggingRef.current = false;
      isScrollingRef.current = false;
      isSwipingRef.current = false;
      // isDragging state v Reactu resetuje stopDrag, nebo zde pokud nebyl drag
      if (!isClickBlockedRef.current) setIsDragging(false);
  };

  const stopDrag = () => {
    const currentOffset = dragOffsetRef.current;
    const totalCardWidth = cardWidth + GAP;
    const movedCards = -currentOffset / totalCardWidth;
    let indexDiff = Math.round(movedCards);

    if (Math.abs(movedCards) > 0.15 && Math.abs(currentOffset) > 50) {
        if (movedCards > 0 && indexDiff === 0) indexDiff = 1;
        if (movedCards < 0 && indexDiff === 0) indexDiff = -1;
    }

    const newIndex = currentIndexRef.current + indexDiff;
    
    setIsTransitioning(true);
    dragOffsetRef.current = 0; 

    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;

    requestAnimationFrame(() => {
        updateVisuals(false); 
    });

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
        setIsDragging(false);
    }, LOCK_DURATION);
  };

  // ============================================================================
  // RESET LOGIC
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDraggingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setIsTransitioning(false);
  };

  const moveSlide = (direction: number) => {
      if (isTransitioning) return;
      
      checkBoundsAndTeleport();
      
      requestAnimationFrame(() => {
          setIsTransitioning(true);
          const step = layoutMode === 'desktop' ? 3 : 1;
          currentIndexRef.current += (direction * step);
          setCurrentIndex(currentIndexRef.current);
          updateVisuals(false); 
          
          if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = setTimeout(() => {
              setIsTransitioning(false);
          }, LOCK_DURATION);
      });
  };

  // ============================================================================
  // JSX
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full select-none group py-4 px-2">
      <style>{`
        .carousel-force-no-animate * {
          animation: none !important;
        }
        .carousel-force-no-animate img {
          transform: translateZ(0) !important;
          backface-visibility: hidden;
          pointer-events: none; /* Důležité pro drag na PC! */
        }
      `}</style>

      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        // POUZE POINTER EVENTS
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        
        style={{
            // pan-y: Prohlížeč ví, že vertikální pohyb je scroll
            touchAction: 'pan-y', 
            paddingBottom: '16px', // Prostor pro shadow
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0, 0.1) 2%, rgba(0,0,0, 0.5) 5%, black 15%, black 85%, rgba(0,0,0, 0.5) 95%, rgba(0,0,0, 0.1) 98%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0, 0.1) 2%, rgba(0,0,0, 0.5) 5%, black 15%, black 85%, rgba(0,0,0, 0.5) 95%, rgba(0,0,0, 0.1) 98%, transparent 100%)'
        }}
      >
        <div
            ref={trackRef}
            className="flex flex-row carousel-force-no-animate"
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                paddingTop: '12px', // Prostor pro shadow nahoře
                paddingBottom: '12px' // Prostor pro shadow dole
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
                            backfaceVisibility: 'hidden',
                            willChange: 'transform, opacity' // GPU akcelerace pro lepší výkon
                        }}
                    >
                        <div className="h-full group"> 
                            <Link 
                                to={item.product.handle ? createProductPath(item.product.handle) : `/product-shopify/${item.product.handle}`}
                                className="block h-full group-hover:-translate-y-2 transition-transform duration-300 ease-out"
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
                                    variantId={item.product.variantId}
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

      {/* Indikátor pozice */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {products.map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-500 ease-out ${
              index === currentProductIndex
                ? 'w-6 h-1 bg-black rounded-full'
                : 'w-1.5 h-1.5 bg-gray-300 rounded-full'
            }`}
            style={{
              transitionProperty: 'width, height, background-color',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;