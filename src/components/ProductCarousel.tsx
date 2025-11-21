import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  // FALLBACK PRO MÁLO PRODUKTŮ (zde animace CHCEME)
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
  const CLONE_COUNT = 2 * products.length; 

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

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  // State pro UI (tlačítka) - NEPOUŽÍVÁ se pro pohyb!
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // REFS pro direct DOM manipulation (bypass React render)
  const currentIndexRef = useRef(START_INDEX); // Interní index pro výpočet pozice
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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
  // DIRECT DOM MANIPULATION - Update Position (Bypass React Render)
  // ============================================================================
  const updatePosition = useCallback(() => {
    if (!trackRef.current || cardWidth === 0) return;
    
    const basePos = getPositionForIndex(currentIndexRef.current);
    const finalPos = basePos + dragOffsetRef.current;
    
    // Přímá manipulace DOM - žádný React re-render!
    trackRef.current.style.transform = `translate3d(${finalPos}px, 0, 0)`;
  }, [getPositionForIndex, cardWidth]);

  // ============================================================================
  // INICIALIZACE A AKTUALIZACE POZICE
  // ============================================================================
  // Inicializace pozice při mountu
  useEffect(() => {
    if (cardWidth > 0 && viewportWidth > 0) {
      updatePosition();
    }
  }, [cardWidth, viewportWidth, updatePosition]);

  // Aktualizace pozice při změně rozměrů (bez animace)
  useEffect(() => {
    if (cardWidth > 0 && viewportWidth > 0 && trackRef.current && !isDragging && !isTransitioning) {
      // Při změně rozměrů aktualizuj pozici okamžitě (bez animace)
      trackRef.current.style.transition = 'none';
      updatePosition();
      requestAnimationFrame(() => {
        if (trackRef.current) {
          trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
        }
      });
    }
  }, [cardWidth, viewportWidth, updatePosition, isDragging, isTransitioning]);

  // ============================================================================
  // GLOBAL DRAG LISTENERS
  // ============================================================================
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const diff = clientX - dragStartX.current;
        dragOffsetRef.current = diff;
        // Přímá aktualizace pozice - žádný setState!
        updatePosition();
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
  }, [isDragging, updatePosition]);

  // ============================================================================
  // LOGIKA POHYBU
  // ============================================================================
  const startDrag = useCallback((clientX: number) => {
    if (isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = clientX;
    dragOffsetRef.current = 0;
    setIsTransitioning(false);
    
    if (trackRef.current) {
        trackRef.current.style.transition = 'none';
    }
  }, []);

  const stopDrag = useCallback(() => {
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
    
    // Aktualizujeme ref (pro výpočet pozice)
    currentIndexRef.current = newIndex;
    
    // Resetujeme drag offset
    dragOffsetRef.current = 0;
    
    // Zapneme CSS transition pro animaci
    if (trackRef.current) {
        trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    }
    
    // Aktualizujeme pozici (s transition)
    updatePosition();
    
    setIsTransitioning(true);
    
    // Synchronizujeme React State (pouze pro UI - tlačítka)
    setCurrentIndex(newIndex);

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  }, [cardWidth, updatePosition]);

  // ============================================================================
  // SEAMLESS RESET (S POTLAČENÍM ANIMACÍ) - Direct DOM Manipulation
  // ============================================================================
  const handleTransitionEnd = useCallback(() => {
    if (!trackRef.current || isDragging || isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const track = trackRef.current;
    const parent = track.parentElement;
    if (!parent) {
        setIsTransitioning(false);
        return;
    }

    // Detekce elementu uprostřed (Distance-Based Detection)
    const parentCenter = parent.getBoundingClientRect().left + (parent.offsetWidth / 2);
    let closestElement: HTMLElement | null = null;
    let minDist = Infinity;

    Array.from(track.children).forEach((child) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const dist = Math.abs(parentCenter - (rect.left + rect.width / 2));
        if (dist < minDist) {
            minDist = dist;
            closestElement = child as HTMLElement;
        }
    });

    if (!closestElement) {
        setIsTransitioning(false);
        return;
    }

    const type = closestElement.dataset.type;
    const productId = closestElement.dataset.productId;

    // TELEPORT - Čistě DOM-based, bez React re-renderu!
    if (type === 'clone' && productId) {
        const originalElement = Array.from(track.children).find(
            child => (child as HTMLElement).dataset.type === 'original' && 
                     (child as HTMLElement).dataset.productId === productId
        ) as HTMLElement;

        if (originalElement) {
            const originalIndex = parseInt(originalElement.dataset.index || '0');
            const newX = getPositionForIndex(originalIndex);

            // 1. Vypni animaci
            isResettingRef.current = true;
            track.style.transition = 'none';
            
            // 2. Aktualizuj interní ref (pro budoucí výpočty)
            currentIndexRef.current = originalIndex;
            
            // 3. Přepiš pozici v DOMu - okamžitě (žádný React re-render!)
            track.style.transform = `translate3d(${newX}px, 0, 0)`;
            
            // 4. Vynutit reflow (flush CSS changes)
            void track.offsetHeight;
            
            // 5. Vrať animaci (na příští tick)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    track.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
                    isResettingRef.current = false;
                    setIsTransitioning(false);
                    
                    // 6. Teprve POTOM synchronizuj React State (pouze pro UI)
                    setCurrentIndex(originalIndex);
                });
            });
            return;
        }
    }

    // Pokud jsme na originálu, jen synchronizuj state
    setIsTransitioning(false);
    const index = parseInt(closestElement.dataset.index || '0');
    currentIndexRef.current = index;
    if (index !== currentIndex) {
        setCurrentIndex(index);
    }
  }, [isDragging, getPositionForIndex, currentIndex]);

  // ============================================================================
  // STYLES
  // ============================================================================
  const getCardStyle = (index: number) => {
    if (cardWidth === 0) return {};
    const totalCardWidth = cardWidth + GAP;
    
    // Používáme ref pro výpočet pozice (aktuální stav, ne React state)
    const trackPos = getPositionForIndex(currentIndexRef.current) + dragOffsetRef.current;
    const cardCenter = trackPos + (index * totalCardWidth) + (cardWidth / 2);
    const viewportCenter = viewportWidth / 2;
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

    return {
        width: `${cardWidth}px`,
        transform: `scale(${scale}) translate3d(0,0,0)`,
        opacity: opacity,
        transition: isDragging ? 'none' : `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`,
        backfaceVisibility: 'hidden' as const,
        WebkitBackfaceVisibility: 'hidden' as const,
    };
  };

  // ============================================================================
  // JSX
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden select-none touch-none group">
      {/* INJECT STYLES: Tento styl natvrdo zakáže všechny animace uvnitř carouselu.
          Řeší to problém "refreshnutí s animací" a "flicker" efekt.
      */}
      <style>{`
        .carousel-force-no-animate * {
          animation: none !important;
          transition: none !important;
        }
        /* Zakázat specificky fade-in animace pokud mají jiné názvy */
        .carousel-force-no-animate .fade-in-up,
        .carousel-force-no-animate .fade-in,
        .carousel-force-no-animate [class*="fade-"] {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
        /* Vynutit hardwarovou akceleraci pro obrázky - GPU caching */
        .carousel-force-no-animate img {
          transform: translateZ(0) !important;
          will-change: transform;
          backfaceVisibility: hidden;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>

      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
        onTouchStart={(e) => { startDrag(e.touches[0].clientX); }}
      >
        <div
            ref={trackRef}
            className="flex flex-row carousel-force-no-animate" // Aplikace třídy pro zákaz animací
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                // Transform je řízen přímo přes updatePosition() - NENÍ v JSX!
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
                        data-product-id={item.product.id}
                        data-type={item.isClone ? 'clone' : 'original'}
                        data-index={i}
                        className="flex-shrink-0"
                        style={{
                            ...getCardStyle(i),
                            willChange: 'transform', // Řekne prohlížeči, že se to bude hýbat
                            contain: 'paint layout', // Izoluje překreslování (zrychlí to)
                        }}
                    >
                        <div className="h-full pointer-events-none"> 
                            <div className={isDragging ? "pointer-events-none" : "pointer-events-auto"}>
                                <Link 
                                    to={item.product.handle ? createProductPath(item.product.handle) : `/product-shopify/${item.product.handle}`}
                                    className="block h-full"
                                    draggable={false}
                                >
                                     {/* Zde se vykreslí karta. Díky třídě .carousel-no-animation
                                        na rodiči budou všechny její vnitřní fade-in efekty potlačeny.
                                     */}
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
                    </div>
                );
            })}
        </div>
      </div>

      {/* Navigace */}
      <button 
        onClick={() => {
          if (isTransitioning || isResettingRef.current) return;
          const newIndex = currentIndexRef.current - 1;
          currentIndexRef.current = newIndex;
          
          if (trackRef.current) {
            trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
          }
          updatePosition();
          setIsTransitioning(true);
          setCurrentIndex(newIndex);
          
          setTimeout(() => setIsTransitioning(false), ANIMATION_DURATION + 50);
        }} 
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        onClick={() => {
          if (isTransitioning || isResettingRef.current) return;
          const newIndex = currentIndexRef.current + 1;
          currentIndexRef.current = newIndex;
          
          if (trackRef.current) {
            trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
          }
          updatePosition();
          setIsTransitioning(true);
          setCurrentIndex(newIndex);
          
          setTimeout(() => setIsTransitioning(false), ANIMATION_DURATION + 50);
        }} 
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default ProductCarousel;