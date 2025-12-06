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
  const ANIMATION_DURATION = 800;
  const LOCK_DURATION = 400;
  const EASING_CURVE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  // Optimalizace: 4 sady klonů pro plynulý nekonečný efekt
  const BUFFER_SETS = 4;
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
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false); 
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX);
  const isClickBlockedRef = useRef(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    return () => resizeObserver.disconnect();
  }, []);

  const getPositionForIndex = useCallback((index: number) => {
    if (cardWidth === 0) return 0;
    const totalCardWidth = cardWidth + GAP;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    return -(index * totalCardWidth) + centerOffset;
  }, [cardWidth, viewportWidth]);

  // ============================================================================
  // INFOGRAFIKA (TEČKY)
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

        card.style.width = `${cardWidth}px`;
        card.style.transform = `scale(${scale}) translateZ(0)`;
        card.style.opacity = `${opacity}`;
        card.style.transition = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ${EASING_CURVE}, opacity ${ANIMATION_DURATION}ms ${EASING_CURVE}`;
    }

  }, [cardWidth, layoutMode, viewportWidth, getPositionForIndex, allSlides.length]);

  useLayoutEffect(() => {
    updateVisuals(isResettingRef.current);
  }, [updateVisuals, currentIndex]); 

  // ============================================================================
  // NATIVE EVENT LISTENERS (TOUCH & MOUSE)
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

  // --- TOUCH (Native, non-blocking scroll) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (isResettingRef.current) return;
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      
      checkBoundsAndTeleport();
      
      dragStartX.current = e.touches[0].clientX;
      dragOffsetRef.current = 0;
      isClickBlockedRef.current = false;
      isDraggingRef.current = false;
      
      setIsTransitioning(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      // Spoléháme na touch-action: pan-y v CSS.
      // Pokud prohlížeč pošle tento event, znamená to, že to NENÍ vertikální scroll.
      const x = e.touches[0].clientX;
      const diffX = x - dragStartX.current;

      // Deadzone
      if (Math.abs(diffX) < 5) return;

      // Jsme v režimu swipe
      isDraggingRef.current = true;
      
      // Zde můžeme preventovat default, aby se nestalo nic divného
      if (e.cancelable) e.preventDefault(); 
      
      dragOffsetRef.current = diffX;
      isClickBlockedRef.current = true; // Blokujeme kliknutí
      
      if (trackRef.current) trackRef.current.style.transition = 'none';
      updateVisuals(true);
  };

  const handleTouchEnd = () => {
      if (isDraggingRef.current) stopDrag();
  };

  // --- MOUSE (Desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault(); 
      if (isResettingRef.current) return;
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      
      checkBoundsAndTeleport();
      dragStartX.current = e.clientX;
      dragOffsetRef.current = 0;
      isClickBlockedRef.current = false;
      
      isDraggingRef.current = true;
      setIsTransitioning(false);
      
      if (trackRef.current) trackRef.current.style.transition = 'none';
      updateVisuals(true);
      
      document.addEventListener('mousemove', handleWindowMouseMove);
      document.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const diff = e.clientX - dragStartX.current;
      dragOffsetRef.current = diff;
      if (Math.abs(diff) > 5) isClickBlockedRef.current = true;
      updateVisuals(true);
  }, [updateVisuals]);
  
  const handleWindowMouseUp = useCallback(() => {
      document.removeEventListener('mousemove', handleWindowMouseMove);
      document.removeEventListener('mouseup', handleWindowMouseUp);
      stopDrag();
  }, []);

  const stopDrag = () => {
    isDraggingRef.current = false;
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
    <div ref={wrapperRef} className="relative w-full select-none group">
      <style>{`
        .carousel-force-no-animate * {
          animation: none !important;
        }
        .carousel-force-no-animate img {
          transform: translateZ(0) !important;
          backface-visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        
        style={{
            // TOTO POVOLUJE SCROLL STRÁNKY:
            touchAction: 'pan-y',
            // Maska pro fade efekt na krajích
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
                // TOTO ZAJISTÍ, ŽE STÍN SE NEOŘÍZNE:
                paddingTop: '40px', 
                paddingBottom: '40px',
                marginTop: '-20px',
                marginBottom: '-20px'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            {allSlides.map((item, i) => {
                const uniqueKey = `${item.isClone ? 'clone' : 'orig'}-${item.product.id}-${i}`;
                const isVisible = Math.abs(i - currentIndex) < 6;

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
                                {/* Použití klasické ProductCard s props pro carousel */}
                                <ProductCard
                                    id={item.product.id}
                                    title={item.product.title}
                                    price={item.product.price}
                                    image={item.product.image}
                                    description={item.product.description}
                                    inventoryQuantity={item.product.inventoryQuantity}
                                    variantId={item.product.variantId}
                                    disableAnimations={true} 
                                    priority={isVisible}
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
      <div className="flex justify-center items-center gap-1.5 mt-4 relative z-20">
        {products.map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-500 ease-out ${
              index === currentProductIndex
                ? 'w-6 h-1 bg-[#502038] rounded-full'
                : 'w-1.5 h-1.5 bg-[#502038]/20 rounded-full'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;