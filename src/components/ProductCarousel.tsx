import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCardLight from './ProductCardLight';
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
  onProductIndexChange?: (index: number) => void;
}

const ProductCarousel = ({ products, onProductIndexChange }: ProductCarouselProps) => {
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
              <ProductCardLight
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                description={product.description}
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
  const ANIMATION_DURATION = 800;
  const LOCK_DURATION = 400;
  const EASING_CURVE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  // BUFFER_SETS = 2 pro všechna zařízení - zajišťuje funkční infinite loop
  // S ProductCardLight (bez context hooks) je 20 karet OK i pro mobily
  const BUFFER_SETS = 2;
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
  const [currentProductIndex, setCurrentProductIndex] = useState(0); // State pro indikátor
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isDraggingRef = useRef(false); 
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX);
  const isClickBlockedRef = useRef(false);
  
  const activePointerId = useRef<number | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // OPTIMALIZACE: Refs pro throttling a virtualizaci
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef(false);
  const resizeRafRef = useRef<number | null>(null);
  const prefetchImagesRef = useRef<HTMLImageElement[]>([]);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // OPTIMALIZACE: Virtualizace - počítáme viditelný rozsah
  const VISIBLE_BUFFER = 3; // Počet karet mimo viewport, které se renderují

  // ============================================================================
  // RESPONZIVITA
  // ============================================================================
  useEffect(() => {
    if (!wrapperRef.current) return;
    
    // OPTIMALIZACE: Throttling pomocí requestAnimationFrame
    const updateDimensions = () => {
      if (resizeRafRef.current !== null) return;
      
      resizeRafRef.current = requestAnimationFrame(() => {
        if (!wrapperRef.current) {
          resizeRafRef.current = null;
          return;
        }
        
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
        
        resizeRafRef.current = null;
      });
    };
    
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapperRef.current);
    
    return () => {
      resizeObserver.disconnect();
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
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
  // TRACKING INDICATOR (INFOGRAFIKA)
  // ============================================================================
  const getCurrentProductIndex = useCallback((index: number): number => {
    const slideData = allSlides[index];
    if (!slideData) return 0;
    return slideData.originalIndex;
  }, [allSlides]);

  useEffect(() => {
    const productIndex = getCurrentProductIndex(currentIndex);
    setCurrentProductIndex(productIndex);
    onProductIndexChange?.(productIndex);
  }, [currentIndex, getCurrentProductIndex, onProductIndexChange]);

  // ============================================================================
  // PREFETCH OBRÁZKŮ PRO PLYNULÉ NAČÍTÁNÍ
  // ============================================================================
  useEffect(() => {
    // OPTIMALIZACE: Cleanup předchozích obrázků před načtením nových
    prefetchImagesRef.current.forEach(img => {
      img.src = ''; // Uvolní paměť
    });
    prefetchImagesRef.current = [];
    
    // Přednahrát obrázky pro následující karty (na pozadí)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const prefetchCount = isMobile ? 2 : 4; // Méně prefetch na mobilu
    
    for (let i = 1; i <= prefetchCount; i++) {
      const nextIdx = currentIndex + i;
      if (nextIdx < allSlides.length) {
        const slide = allSlides[nextIdx];
        if (slide?.product?.image) {
          const img = new Image();
          img.src = slide.product.image;
          prefetchImagesRef.current.push(img);
        }
      }
    }
    
    // Cleanup při unmount nebo změně
    return () => {
      prefetchImagesRef.current.forEach(img => {
        img.src = '';
      });
      prefetchImagesRef.current = [];
    };
  }, [currentIndex, allSlides]);

  // ============================================================================
  // VISUAL UPDATE ENGINE
  // ============================================================================
  // OPTIMALIZACE: Interní funkce pro skutečný update (bez throttlingu)
  const updateVisualsInternal = useCallback((instant = false, overrideIndex?: number) => {
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

        // OPTIMALIZACE: Aplikace stylů přímo na kartu bez querySelector
        // Odstraněn querySelector('img') z loopu - eliminuje DOM queries
        const transitionValue = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ${EASING_CURVE}, opacity ${ANIMATION_DURATION}ms ${EASING_CURVE}`;
        
        card.style.width = `${cardWidth}px`;
        card.style.transform = `scale(${scale}) translateZ(0)`;
        card.style.opacity = `${opacity}`;
        card.style.transition = transitionValue;
    }
  }, [cardWidth, layoutMode, viewportWidth, getPositionForIndex, allSlides.length]);

  // OPTIMALIZACE: Throttled wrapper pro updateVisuals
  const updateVisuals = useCallback((instant = false, overrideIndex?: number) => {
    // Pokud je instant nebo dragging, aktualizuj okamžitě
    if (instant || isDraggingRef.current) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      updateVisualsInternal(instant, overrideIndex);
      return;
    }

    // Pro normální updates použij throttling
    if (rafRef.current !== null) {
      pendingUpdateRef.current = true;
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      updateVisualsInternal(instant, overrideIndex);
      rafRef.current = null;
      
      // Pokud je pending update, spusť další
      if (pendingUpdateRef.current) {
        pendingUpdateRef.current = false;
        updateVisuals(false);
      }
    });
  }, [updateVisualsInternal]);

  // OPTIMALIZACE: Vypočítat viditelný rozsah pro virtualizaci
  const getVisibleRange = useCallback(() => {
    if (cardWidth === 0 || viewportWidth === 0) {
      return { startIndex: 0, endIndex: allSlides.length - 1 };
    }
    const totalCardWidth = cardWidth + GAP;
    const visibleCount = Math.ceil(viewportWidth / totalCardWidth);
    const startIndex = Math.max(0, currentIndex - VISIBLE_BUFFER);
    const endIndex = Math.min(allSlides.length - 1, currentIndex + visibleCount + VISIBLE_BUFFER);
    return { startIndex, endIndex };
  }, [currentIndex, cardWidth, viewportWidth, allSlides.length]);

  useLayoutEffect(() => {
    updateVisuals(isResettingRef.current);
  }, [updateVisuals, currentIndex]); 

  // ============================================================================
  // POINTER EVENTS LOGIC
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

  const handlePointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0 || activePointerId.current !== null) return;
      activePointerId.current = e.pointerId;

      if (isResettingRef.current) return;
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

      checkBoundsAndTeleport();

      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragOffsetRef.current = 0;
      isClickBlockedRef.current = false;
      isDraggingRef.current = false;
      setIsTransitioning(false);
      
      if (trackRef.current) {
          trackRef.current.style.transition = 'none';
      }

      if (e.pointerType === 'mouse') {
          e.preventDefault();
          isDraggingRef.current = true;
          setIsDragging(true);
          const element = e.target as HTMLElement;
          element.setPointerCapture(e.pointerId);
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;

      const diffX = e.clientX - dragStartX.current;
      const diffY = e.clientY - dragStartY.current;

      if (!isDraggingRef.current && e.pointerType !== 'mouse') {
          if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) return;
          
          if (Math.abs(diffY) > Math.abs(diffX)) {
              activePointerId.current = null;
              return;
          }

          isDraggingRef.current = true;
          setIsDragging(true);
          const element = e.target as HTMLElement;
          element.setPointerCapture(e.pointerId);
      }

      if (isDraggingRef.current) {
          if (e.cancelable && e.pointerType !== 'mouse') e.preventDefault();
          
          dragOffsetRef.current = diffX;
          if (Math.abs(diffX) > 5) isClickBlockedRef.current = true;
          updateVisuals(true);
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      
      if (isDraggingRef.current) {
          const element = e.target as HTMLElement;
          try {
            if (element.hasPointerCapture(e.pointerId)) {
                element.releasePointerCapture(e.pointerId);
            }
          } catch(err) { /* ignore */ }
          stopDrag();
      }
      
      activePointerId.current = null;
      isDraggingRef.current = false;
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
    <div ref={wrapperRef} className="relative w-full select-none">
      {/* Styly přesunuty do index.css pro lepší výkon */}
      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        
        style={{
            touchAction: 'pan-y',
            // OPTIMALIZACE: Jednodušší maskImage na mobilech, komplexnější na desktopu
            ...(layoutMode === 'desktop' ? {
              maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
            } : {
              // Na mobilech bez maskImage - lepší výkon
            })
        }}
      >
        <div
            ref={trackRef}
            className="flex flex-row carousel-force-no-animate"
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                // OPTIMALIZACE: Odstraněn willChange - může způsobovat problémy na mobilech
                backfaceVisibility: 'hidden',
                paddingTop: '40px', 
                paddingBottom: '40px',
                marginTop: '-20px',
                marginBottom: '-20px'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            {(() => {
                // OPTIMALIZACE: Virtualizace - renderovat jen viditelné karty + buffer
                const { startIndex, endIndex } = getVisibleRange();
                
                return allSlides.map((item, i) => {
                    const uniqueKey = `${item.isClone ? 'clone' : 'orig'}-${item.product.id}-${i}`;
                    const isVisible = i >= startIndex && i <= endIndex;
                    
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
                            {isVisible ? (
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
                                        <ProductCardLight
                                            id={item.product.id}
                                            title={item.product.title}
                                            price={item.product.price}
                                            image={item.product.image}
                                            description={item.product.description}
                                            disableAnimations={true}
                                        />
                                    </Link>
                                </div>
                            ) : (
                                // Placeholder pro neviditelné karty - zachovává layout a pozice
                                <div 
                                    className="h-full"
                                    style={{ 
                                        minHeight: cardWidth > 0 ? `${cardWidth * 1.3}px` : '400px' 
                                    }}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    );
                });
            })()}
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