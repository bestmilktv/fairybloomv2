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
  
  // Zvýšený počet klonů pro jistotu (min 3 sady na každou stranu nebo 10 items)
  const CLONE_COUNT = Math.max(3, Math.ceil(10 / products.length)) * products.length;

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

  // Index prvního originálu
  const START_INDEX = CLONE_COUNT; 
  // Range originálů pro detekci
  const FIRST_ORIGINAL_INDEX = CLONE_COUNT;
  const LAST_ORIGINAL_INDEX = CLONE_COUNT + products.length - 1;

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs pro přímou manipulaci
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX); // Ref verze indexu pro okamžitý přístup
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronizace refu s indexem
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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

    // 1. Posun Tracku
    const basePos = getPositionForIndex(targetIndex);
    const finalPos = basePos + currentDrag;
    
    trackRef.current.style.transform = `translate3d(${finalPos}px, 0, 0)`;
    trackRef.current.style.transition = (isDraggingRef.current || instant) 
        ? 'none' 
        : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;

    // 2. Stylování Karet
    cardRefs.current.forEach((card, i) => {
        if (!card) return;

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

        card.style.transform = `scale(${scale}) translateZ(0)`;
        card.style.opacity = `${opacity}`;
        card.style.width = `${cardWidth}px`;
        
        card.style.transition = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`;
    });

  }, [cardWidth, isDesktop, viewportWidth, getPositionForIndex]);

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
        updateVisuals(true); 
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
  // LOGIKA DRAG & DROP (S OKAMŽITÝM RESETEM)
  // ============================================================================
  
  // Funkce pro bezpečný reset na originál, pokud jsme v zóně klonů
  const teleportToOriginalIfNeeded = () => {
    const current = currentIndexRef.current;
    
    // Pokud jsme mimo bezpečný střed (originály)
    if (current < FIRST_ORIGINAL_INDEX || current > LAST_ORIGINAL_INDEX) {
        // Najdeme odpovídající index v originálech
        // V allSlides máme uložený 'originalIndex', který je 0..length-1
        // Skutečný index v poli allSlides pro tento originál je START_INDEX + originalIndex
        const slideData = allSlides[current];
        if (!slideData) return; // Safety

        const targetIndex = START_INDEX + slideData.originalIndex;
        
        // OKAMŽITÝ TELEPORT
        isResettingRef.current = true;
        
        // 1. Aktualizujeme ref indexu
        currentIndexRef.current = targetIndex;
        setCurrentIndex(targetIndex);
        
        // 2. Vypneme transition a posuneme DOM
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            // Vypočítáme novou pozici
            const newPos = getPositionForIndex(targetIndex);
            trackRef.current.style.transform = `translate3d(${newPos}px, 0, 0)`;
            // Flush
            void trackRef.current.offsetHeight;
        }
        
        // 3. Resetneme drag offset, protože začínáme nanovo
        dragOffsetRef.current = 0;
        setDragOffset(0);
        
        // 4. Aktualizujeme karty
        updateVisuals(true, targetIndex);
        
        // Uvolníme zámek (hned, protože budeme dragovat)
        isResettingRef.current = false;
    }
  };

  const startDrag = (clientX: number) => {
    if (isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // KROK 1: ZKONTROLUJEME, ZDA NEJSME NA KONCI SVĚTA
    // Pokud ano, teleportujeme se doprostřed předtím, než začneme táhnout.
    teleportToOriginalIfNeeded();

    // KROK 2: ZAČÍNÁME DRAG (teď už jsme bezpečně uprostřed)
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = clientX;
    dragOffsetRef.current = 0;
    setDragOffset(0);
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

    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  };

  // ============================================================================
  // SEAMLESS RESET (TELEPORT PO ANIMACI)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDragging) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // Stejná logika jako při startDrag, ale po dojetí animace
    const current = currentIndexRef.current;
    
    if (current < FIRST_ORIGINAL_INDEX || current > LAST_ORIGINAL_INDEX) {
        const slideData = allSlides[current];
        if (slideData) {
            const targetIndex = START_INDEX + slideData.originalIndex;
            
            isResettingRef.current = true;
            
            // Teleport
            if (trackRef.current) {
                trackRef.current.style.transition = 'none';
                const newPos = getPositionForIndex(targetIndex);
                trackRef.current.style.transform = `translate3d(${newPos}px, 0, 0)`;
                void trackRef.current.offsetHeight;
            }

            setCurrentIndex(targetIndex);
            currentIndexRef.current = targetIndex;
            
            updateVisuals(true, targetIndex);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    isResettingRef.current = false;
                    setIsTransitioning(false);
                    // Vrátíme animaci pro další kliknutí/drag
                    if (trackRef.current) {
                         trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
                    }
                    updateVisuals(false, targetIndex);
                });
            });
            return;
        }
    }

    setIsTransitioning(false);
  };

  // ============================================================================
  // RENDER HELPERY
  // ============================================================================
  const getTransform = () => {
    const basePos = getPositionForIndex(currentIndex);
    const finalPos = basePos + dragOffset;
    return `translate3d(${finalPos}px, 0, 0)`;
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
          will-change: transform;
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
                transform: getTransform(),
                transition: isDragging ? 'none' : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
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
                        data-product-id={item.product.id}
                        data-type={item.isClone ? 'clone' : 'original'}
                        data-index={i}
                        className="flex-shrink-0"
                        style={{
                            width: `${cardWidth}px`,
                            willChange: 'transform, opacity',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <div className="h-full pointer-events-none"> 
                            <div className={isDragging ? "pointer-events-none" : "pointer-events-auto"}>
                                <Link 
                                    to={item.product.handle ? createProductPath(item.product.handle) : `/product-shopify/${item.product.handle}`}
                                    className="block h-full"
                                    draggable={false}
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
                    </div>
                );
            })}
        </div>
      </div>

      {/* Navigace */}
      <button onClick={() => !isTransitioning && setCurrentIndex(prev => prev - 1)} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={() => !isTransitioning && setCurrentIndex(prev => prev + 1)} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default ProductCarousel;