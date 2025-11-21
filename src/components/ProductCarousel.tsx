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
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs pro DOM manipulaci (obcházíme React state pro plynulost)
  const dragStartX = useRef(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]); // Pole referencí na karty
  
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

  // Pomocná funkce pro výpočet základní pozice
  const getBasePosition = useCallback((index: number) => {
    if (cardWidth === 0) return 0;
    const totalCardWidth = cardWidth + GAP;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    return -(index * totalCardWidth) + centerOffset;
  }, [cardWidth, viewportWidth]);


  // ============================================================================
  // CORE: VISUAL UPDATE ENGINE (Hybridní přístup)
  // ============================================================================
  // Tato funkce je mozek celého carouselu. Aktualizuje DOM přímo.
  // Volá se při dragu, při změně indexu i při resetu.
  const updateVisuals = useCallback((instant = false, overrideIndex?: number) => {
    if (!trackRef.current || cardWidth === 0) return;

    const targetIndex = overrideIndex !== undefined ? overrideIndex : currentIndex;
    const currentDrag = dragOffsetRef.current;
    const totalCardWidth = cardWidth + GAP;
    const viewportCenter = viewportWidth / 2;

    // 1. Posun Tracku
    const basePos = getBasePosition(targetIndex);
    const finalPos = basePos + currentDrag;
    
    trackRef.current.style.transform = `translate3d(${finalPos}px, 0, 0)`;
    trackRef.current.style.transition = (isDraggingRef.current || instant) 
        ? 'none' 
        : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;

    // 2. Stylování Karet (Scale & Opacity)
    // Protože to děláme přímo v DOMu, React nám do toho "neblikne".
    cardRefs.current.forEach((card, i) => {
        if (!card) return;

        // Kde je střed této karty ve viewportu?
        // Pozice tracku + offset karty + polovina šířky
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
        
        // Pro karty vypneme transition při dragu/resetu, jinak ji zapneme
        card.style.transition = (isDraggingRef.current || instant) 
            ? 'none' 
            : `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`;
    });

  }, [cardWidth, currentIndex, isDesktop, viewportWidth, getBasePosition]);

  // useLayoutEffect zajistí, že se vizuál aktualizuje synchronně s React renderem
  // Tím zabráníme jakémukoliv probliknutí.
  useLayoutEffect(() => {
    updateVisuals(isResettingRef.current);
  }, [updateVisuals, currentIndex]); // Reagujeme na změnu indexu


  // ============================================================================
  // GLOBAL DRAG LISTENERS
  // ============================================================================
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const diff = clientX - dragStartX.current;
        dragOffsetRef.current = diff;
        
        // Voláme update přímo = 60fps plynulost bez React renderu
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
  // LOGIKA DRAG & DROP
  // ============================================================================
  const startDrag = (clientX: number) => {
    if (isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = clientX;
    dragOffsetRef.current = 0;
    setIsTransitioning(false);
    
    updateVisuals(true); // Okamžitý update
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

    const newIndex = currentIndex + indexDiff;
    
    setIsTransitioning(true);
    dragOffsetRef.current = 0; // Reset offsetu

    // Tady jen nastavíme state. Efekt `useLayoutEffect` se postará o animaci.
    setCurrentIndex(newIndex);

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  };

  // ============================================================================
  // SEAMLESS RESET (TELEPORT)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDragging) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const track = trackRef.current;
    const parent = track.parentElement;
    if (!parent) { setIsTransitioning(false); return; }

    // Detekce elementu uprostřed (čisté DOM měření)
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

    if (!closestElement) { setIsTransitioning(false); return; }

    const type = closestElement.dataset.type;
    const productId = closestElement.dataset.productId;

    // === LOGIKA TELEPORTACE ===
    if (type === 'clone' && productId) {
        const originalElement = Array.from(track.children).find(
            child => (child as HTMLElement).dataset.type === 'original' && 
                     (child as HTMLElement).dataset.productId === productId
        ) as HTMLElement;

        if (originalElement) {
            const originalIndex = parseInt(originalElement.dataset.index || '0');
            
            isResettingRef.current = true;
            
            // 1. Update State (React)
            // Nastavíme index, což spustí re-render a useLayoutEffect.
            // Ale protože máme isResettingRef=true, useLayoutEffect zavolá updateVisuals s instant=true
            setCurrentIndex(originalIndex);
            
            // 2. Okamžitý DOM Update (pro jistotu, aby to bylo v tomtéž ticku)
            updateVisuals(true, originalIndex);

            // 3. Flush
            void track.offsetHeight; 

            // 4. Obnovení animací (Next Frame)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    isResettingRef.current = false;
                    setIsTransitioning(false);
                    // Vynutíme překreslení s animacemi
                    updateVisuals(false, originalIndex);
                });
            });
            return;
        }
    }

    setIsTransitioning(false);
    const index = parseInt(closestElement.dataset.index || '0');
    if (index !== currentIndex) {
        setCurrentIndex(index);
    }
  };

  // ============================================================================
  // JSX
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden select-none touch-none group">
      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
        onTouchStart={(e) => { startDrag(e.touches[0].clientX); }}
      >
        <div
            ref={trackRef}
            className="flex flex-row"
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                // Transform a Transition řídíme kompletně přes JS (updateVisuals)
                // Zde jen defaulty pro první render
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
                        // Styly (width, scale, opacity) řídíme přes JS
                        style={{
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