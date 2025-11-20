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
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
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
  // GLOBAL DRAG LISTENERS
  // ============================================================================
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const diff = clientX - dragStartX.current;
        dragOffsetRef.current = diff;
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
  }, [isDragging]);

  // ============================================================================
  // LOGIKA POHYBU
  // ============================================================================
  const startDrag = (clientX: number) => {
    if (isResettingRef.current) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = clientX;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsTransitioning(false);
    
    if (trackRef.current) {
        trackRef.current.style.transition = 'none';
    }
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
    setCurrentIndex(newIndex);
    setDragOffset(0);
    dragOffsetRef.current = 0;

    if (trackRef.current) {
        trackRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
        if (isResettingRef.current) return;
        setIsTransitioning(false);
    }, ANIMATION_DURATION + 50);
  };

  // ============================================================================
  // SEAMLESS RESET (S POTLAČENÍM ANIMACÍ)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDragging) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const track = trackRef.current;
    const parent = track.parentElement;
    if (!parent) {
        setIsTransitioning(false);
        return;
    }

    // Detekce elementu uprostřed
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

    // TELEPORT
    if (type === 'clone' && productId) {
        const originalElement = Array.from(track.children).find(
            child => (child as HTMLElement).dataset.type === 'original' && 
                     (child as HTMLElement).dataset.productId === productId
        ) as HTMLElement;

        if (originalElement) {
            const originalIndex = parseInt(originalElement.dataset.index || '0');
            const newX = getPositionForIndex(originalIndex);

            isResettingRef.current = true;
            track.style.transition = 'none';
            track.style.transform = `translate3d(${newX}px, 0, 0)`;
            void track.offsetHeight; 

            setCurrentIndex(originalIndex);
            
            requestAnimationFrame(() => {
                 requestAnimationFrame(() => {
                    track.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
                    isResettingRef.current = false;
                    setIsTransitioning(false);
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
  // STYLES
  // ============================================================================
  const getTransform = () => {
    const basePos = getPositionForIndex(currentIndex);
    const finalPos = basePos + dragOffset;
    return `translate3d(${finalPos}px, 0, 0)`;
  };

  const getCardStyle = (index: number) => {
    if (cardWidth === 0) return {};
    const totalCardWidth = cardWidth + GAP;
    
    const trackPos = getPositionForIndex(currentIndex) + dragOffset;
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
      {/* INJECT STYLES: Tento styl natvrdo zakáže fade-in animace uvnitř carouselu.
          Řeší to problém "refreshnutí s animací".
      */}
      <style>{`
        .carousel-no-animation * {
          animation: none !important;
          transition-property: transform, opacity !important; /* Povolit jen námi řízené transitions */
        }
        /* Zakázat specificky fade-in animace pokud mají jiné názvy */
        .carousel-no-animation .fade-in-up,
        .carousel-no-animation .fade-in,
        .carousel-no-animation [class*="fade-"] {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      `}</style>

      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
        onTouchStart={(e) => { startDrag(e.touches[0].clientX); }}
      >
        <div
            ref={trackRef}
            className="flex flex-row carousel-no-animation" // Aplikace třídy pro zákaz animací
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
                        data-product-id={item.product.id}
                        data-type={item.isClone ? 'clone' : 'original'}
                        data-index={i}
                        className="flex-shrink-0"
                        style={getCardStyle(i)}
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