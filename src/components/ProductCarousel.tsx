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
  // Zvýšíme počet klonů pro bezpečný buffer
  const CLONE_COUNT = Math.max(4, products.length); 

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

  // Indexy
  const START_INDEX = CLONE_COUNT;
  const ORIGINAL_START = CLONE_COUNT;
  const ORIGINAL_END = CLONE_COUNT + products.length - 1;

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0); // Jen pro trigger renderu v případě potřeby
  
  // Refs pro High-Performance logiku
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX); // Hlavní zdroj pravdy pro pozici
  
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
  // VISUAL UPDATE ENGINE (Hybridní Direct DOM Manipulation)
  // ============================================================================
  const updateVisuals = useCallback((instant = false) => {
    if (!trackRef.current || cardWidth === 0) return;

    // Používáme currentIndexRef pro aktuální logický index
    const targetIndex = currentIndexRef.current;
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

    // 2. Stylování Karet (Scale & Opacity)
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

        card.style.width = `${cardWidth}px`;
        card.style.transform = `scale(${scale}) translateZ(0)`;
        card.style.opacity = `${opacity}`;
        
        card.style.transition = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`;
    });

  }, [cardWidth, isDesktop, viewportWidth, getPositionForIndex]);

  // Synchronizace při mountu nebo změně rozměrů
  useLayoutEffect(() => {
    updateVisuals(isResettingRef.current);
  }, [updateVisuals, viewportWidth, cardWidth]); 


  // ============================================================================
  // INFINITE LOOP MAGIC (Treadmill Logic)
  // ============================================================================
  const checkAndResetBounds = useCallback(() => {
    if (cardWidth === 0) return;
    
    const current = currentIndexRef.current;
    const totalCardWidth = cardWidth + GAP;
    const totalOriginalsWidth = products.length * totalCardWidth;

    let needsTeleport = false;
    let indexShift = 0;

    // Pokud jsme příliš vlevo (v levých klonech)
    if (current < ORIGINAL_START) {
        needsTeleport = true;
        indexShift = products.length; // Posuneme index doprava (na originály)
        // A musíme posunout dragStart DOLEVA, aby vizuální pozice zůstala stejná
        // Logika: Zvýšíme index (+), takže Track se posune doleva (-). 
        // Aby zůstal na místě, musíme zvýšit Drag (+). 
        // Drag = Client - Start. Aby se Drag zvýšil, Start se musí snížit.
        dragStartX.current -= totalOriginalsWidth;
    } 
    // Pokud jsme příliš vpravo (v pravých klonech)
    else if (current > ORIGINAL_END) {
        needsTeleport = true;
        indexShift = -products.length; // Posuneme index doleva (na originály)
        // Snížíme index (-), Track se posune doprava (+).
        // Musíme snížit Drag (-).
        // Start se musí zvýšit.
        dragStartX.current += totalOriginalsWidth;
    }

    if (needsTeleport) {
        currentIndexRef.current += indexShift;
        // Update state bez triggeru re-render efektů (používáme ref pro drag)
        setCurrentIndex(currentIndexRef.current);
    }
  }, [cardWidth, products.length, ORIGINAL_START, ORIGINAL_END]);


  // ============================================================================
  // GLOBAL LISTENERS (DRAG)
  // ============================================================================
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        
        // 1. Spočítáme aktuální posun
        let diff = clientX - dragStartX.current;
        const totalCardWidth = cardWidth + GAP;

        // 2. TREADMILL LOGIKA: Posouváme index během dragu, pokud přetáhneme o celou kartu
        // Tím zajistíme, že dragOffset zůstane malý a index se mění plynule
        while (diff > totalCardWidth) {
            currentIndexRef.current--;
            dragStartX.current += totalCardWidth;
            diff -= totalCardWidth;
            checkAndResetBounds(); // Kontrola nekonečna
        }
        while (diff < -totalCardWidth) {
            currentIndexRef.current++;
            dragStartX.current -= totalCardWidth;
            diff += totalCardWidth;
            checkAndResetBounds(); // Kontrola nekonečna
        }

        dragOffsetRef.current = diff;
        
        // 3. Překreslíme
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
  }, [isDragging, updateVisuals, checkAndResetBounds, cardWidth]);

  // ============================================================================
  // LOGIKA OVLÁDÁNÍ
  // ============================================================================
  const startDrag = (clientX: number) => {
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
    updateVisuals(true); 
  };

  const stopDrag = () => {
    setIsDragging(false);
    isDraggingRef.current = false;

    const currentOffset = dragOffsetRef.current;
    const totalCardWidth = cardWidth + GAP;
    const movedCards = -currentOffset / totalCardWidth;
    let indexDiff = Math.round(movedCards);

    // Švihnutí
    if (Math.abs(movedCards) > 0.1 && Math.abs(currentOffset) > 50) {
        if (movedCards > 0 && indexDiff === 0) indexDiff = 1;
        if (movedCards < 0 && indexDiff === 0) indexDiff = -1;
    }

    // Aplikujeme změnu indexu
    currentIndexRef.current += indexDiff;
    
    // Kontrola hranic po puštění (pro jistotu)
    checkAndResetBounds();

    // Synchronizujeme state
    setCurrentIndex(currentIndexRef.current);
    
    setIsTransitioning(true);
    dragOffsetRef.current = 0; // Reset offsetu (protože jsme už posunuli index)
    setDragOffset(0); 

    // Spustíme animaci dojezdu na novou pozici
    if (trackRef.current) {
        // Vypočítáme, kam má dojet (base position nového indexu)
        const targetPos = getPositionForIndex(currentIndexRef.current);
        trackRef.current.style.transform = `translate3d(${targetPos}px, 0, 0)`;
        trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
        
        // Update stylů karet pro animaci
        updateVisuals(false);
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  };

  // ============================================================================
  // TRANSITION END (Pro jistotu, kdyby něco uteklo)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (isDraggingRef.current) return;
    setIsTransitioning(false);
    // Znovu zkontrolujeme hranice po dojetí animace
    const prevIndex = currentIndexRef.current;
    checkAndResetBounds();
    if (prevIndex !== currentIndexRef.current) {
        // Pokud došlo k resetu bounds, musíme okamžitě aktualizovat vizuál bez animace
        updateVisuals(true);
    }
  };

  // Navigace tlačítky
  const moveSlide = (step: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      currentIndexRef.current += step;
      checkAndResetBounds(); // Check before move? No, after logic.
      
      // Simple update
      setCurrentIndex(currentIndexRef.current);
      updateVisuals(false);
      
      setTimeout(() => {
          setIsTransitioning(false);
          // Check bounds after animation
          const prev = currentIndexRef.current;
          checkAndResetBounds();
          if (prev !== currentIndexRef.current) updateVisuals(true);
      }, ANIMATION_DURATION);
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
                // Transform je řízen přes JS
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