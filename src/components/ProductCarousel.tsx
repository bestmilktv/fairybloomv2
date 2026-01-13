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
  tags?: string[];
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
              <ProductCardLight
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                description={product.description}
                tags={product.tags}
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
  // Spring tuning (Apple-like: fast start, smooth settle, no "snap" or jank).
  // Units are px and seconds.
  // Slower, more premium glide (less acceleration, longer settle).
  const SPRING_STIFFNESS = 145; // k (~-25%)
  const SPRING_DAMPING = 33; // c (scaled to keep similar damping ratio)
  const SETTLE_DISTANCE_PX = 0.75;
  const SETTLE_VELOCITY_PX_PER_S = 18;
  const MAX_DT_MS = 32;

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
  // During fast drag/spring motion we update a separate lightweight index for virtualization/rendering,
  // so we never "outrun" the rendered window (which looks like skipping/bugging).
  const [renderIndex, setRenderIndex] = useState(START_INDEX);
  const [currentProductIndex, setCurrentProductIndex] = useState(0); // State pro indikátor
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isDraggingRef = useRef(false); 
  const dragOffsetRef = useRef(0);
  const currentIndexRef = useRef(START_INDEX);
  const renderIndexRef = useRef(START_INDEX);
  const isClickBlockedRef = useRef(false);
  
  // Velocity tracking
  const lastDragX = useRef(0);
  const lastDragTime = useRef(0);
  const velocityRef = useRef(0);
  
  const activePointerId = useRef<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isResettingRef = useRef(false);
  
  // RAF refs
  const dragRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const prefetchImagesRef = useRef<HTMLImageElement[]>([]);
  
  // Trackpad support refs
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWheelingRef = useRef(false);

  // Spring animation state (single-writer: track transform only)
  const animRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const targetXRef = useRef(0);
  const velocityXRef = useRef(0);
  const isSpringAnimatingRef = useRef(false);
  const lastSettledIndexRef = useRef(START_INDEX);
  const dragBaseXRef = useRef(0);
  const lastCardFxTsRef = useRef<number>(0);
  const lastRenderIdxTsRef = useRef<number>(0);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // OPTIMALIZACE: Virtualizace - počítáme viditelný rozsah
  const VISIBLE_BUFFER = 6; // Zvýšeno z 3 na 6, aby při velkém kroku (3) a pomalé animaci nedocházelo k mizení karet

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
          setCardWidth(width * 0.72);
        }
        
        setIsInitialized(true);
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
    // Na mobilech přidáme malinkatý offset, aby byl vidět kousek předchozího produktu
    const centerOffset = layoutMode === 'mobile' ? GAP + 10 : (viewportWidth - cardWidth) / 2;
    return -(index * totalCardWidth) + centerOffset;
  }, [cardWidth, viewportWidth, layoutMode]);

  const getCenterOffsetPx = useCallback(() => {
    // Must mirror `getPositionForIndex`’s center offset logic
    return layoutMode === 'mobile' ? GAP + 10 : (viewportWidth - cardWidth) / 2;
  }, [GAP, cardWidth, layoutMode, viewportWidth]);

  const estimateIndexFloatFromX = useCallback((x: number) => {
    if (cardWidth === 0) return currentIndexRef.current;
    const totalCardWidth = cardWidth + GAP;
    const centerOffset = getCenterOffsetPx();
    // x = -(index*tw) + centerOffset  => index = (centerOffset - x) / tw
    return (centerOffset - x) / totalCardWidth;
  }, [GAP, cardWidth, getCenterOffsetPx]);

  // Keep indices always inside a safe window of our cloned slide list to guarantee infinite loop.
  // This prevents drifting outside `allSlides` length while keeping the same visual product (modulo).
  const rebaseToSafeIndex = useCallback((index: number) => {
    const len = products.length;
    // START_INDEX corresponds to originalIndex = 0
    const originalIndex = ((index - START_INDEX) % len + len) % len;
    return START_INDEX + originalIndex;
  }, [START_INDEX, products.length]);

  // Keep index safely inside clone window *and* keep X bounded (no drifting into empty space).
  // We do this by shifting index by whole product cycles (±products.length) and shifting X by the
  // matching pixel amount so the visible content does not jump.
  const rebaseIndexByCycles = useCallback((index: number) => {
    if (cardWidth === 0) return { index, shiftPx: 0 };
    const len = products.length;
    const tw = cardWidth + GAP;

    let next = index;
    let shiftPx = 0;

    while (next > SAFE_ZONE_END) {
      next -= len;
      shiftPx += len * tw;
    }
    while (next < SAFE_ZONE_START) {
      next += len;
      shiftPx -= len * tw;
    }
    return { index: next, shiftPx };
  }, [GAP, SAFE_ZONE_END, SAFE_ZONE_START, cardWidth, products.length]);

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
  }, [currentIndex, getCurrentProductIndex]);

  const maybeUpdateRenderIndex = useCallback((x: number, nowTs?: number) => {
    const ts = nowTs ?? performance.now();
    // Throttle to avoid excessive React re-renders while still keeping virtualization aligned.
    if (ts - lastRenderIdxTsRef.current < 50) return;
    lastRenderIdxTsRef.current = ts;

    const idx = Math.round(estimateIndexFloatFromX(x));
    const clamped = Math.max(0, Math.min(allSlides.length - 1, idx));
    if (clamped !== renderIndexRef.current) {
      renderIndexRef.current = clamped;
      setRenderIndex(clamped);
    }
  }, [allSlides.length, estimateIndexFloatFromX]);

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
  // SPRING VISUAL ENGINE (single RAF writer)
  // ============================================================================
  const applyTrackTransform = useCallback((x: number, isAnimating: boolean) => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    // We do not use CSS transitions for motion; the spring drives the value.
    el.style.transition = 'none';
    el.style.willChange = isAnimating ? 'transform' : '';
    el.style.transform = `translate3d(${x}px, 0, 0)`;
  }, []);

  const updateCardEffectsAtX = useCallback((x: number, isAnimating: boolean, nowTs?: number) => {
    // Desktop/tablet only
    if (layoutMode === 'mobile') return;
    if (cardWidth === 0 || viewportWidth === 0) return;

    // Throttle while animating to keep CPU low but visuals responsive.
    const ts = nowTs ?? performance.now();
    if (isAnimating) {
      if (ts - lastCardFxTsRef.current < 16) return; // ~60fps-ish
      lastCardFxTsRef.current = ts;
    }

    const totalCardWidth = cardWidth + GAP;
    const viewportCenter = viewportWidth / 2;

    const visibleCount = Math.ceil(viewportWidth / totalCardWidth) + 2;
    const anchorFloat = estimateIndexFloatFromX(x);
    // Use floor/ceil around a *continuous* center so both sides update symmetrically.
    const anchorMin = Math.floor(anchorFloat);
    const anchorMax = Math.ceil(anchorFloat);
    const startIndex = Math.max(0, anchorMin - visibleCount - 8);
    const endIndex = Math.min(allSlides.length - 1, anchorMax + visibleCount + 8);

    for (let i = startIndex; i <= endIndex; i++) {
      const card = cardRefs.current[i];
      if (!card) continue;

      const cardTrackPos = x + (i * totalCardWidth);
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
      } else if (layoutMode === 'tablet') {
        const mainZone = totalCardWidth * 0.5;
        if (dist > mainZone) {
          const factor = Math.min(1, (dist - mainZone) / totalCardWidth);
          scale = 1 - (factor * 0.15);
          opacity = 1 - (factor * 0.5);
        }
      }

      // During motion: keep effects responsive (short transition), at rest: premium settle.
      card.style.transform = `scale(${scale}) translateZ(0)`;
      card.style.opacity = `${opacity}`;
      card.style.transition = isAnimating
        ? 'none'
        : `transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms cubic-bezier(0.16, 1, 0.3, 1)`;
    }
  }, [GAP, allSlides.length, cardWidth, estimateIndexFloatFromX, layoutMode, viewportWidth]);

  const cancelSpring = useCallback(() => {
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
    lastFrameTimeRef.current = null;
    isSpringAnimatingRef.current = false;
  }, []);

  const settleAndRebaseIfNeeded = useCallback(() => {
    // Mark settled
    setIsTransitioning(false);
    lastSettledIndexRef.current = currentIndexRef.current;

    // If out of safe zone, teleport to equivalent index AFTER settle (invisible because slide is the same).
    const current = currentIndexRef.current;
    const { index: rebasedIndex, shiftPx } = rebaseIndexByCycles(current);
    if (rebasedIndex !== current) {
      // Shift physical X by whole cycles so the visible content does not jump.
      currentXRef.current += shiftPx;
      targetXRef.current += shiftPx;
      dragBaseXRef.current += shiftPx;

      currentIndexRef.current = rebasedIndex;
      setCurrentIndex(rebasedIndex);
      applyTrackTransform(currentXRef.current, false);
    }

    updateCardEffectsAtX(currentXRef.current, false);
  }, [applyTrackTransform, rebaseIndexByCycles, updateCardEffectsAtX]);

  const startSpring = useCallback(() => {
    if (cardWidth === 0) return;
    if (isDraggingRef.current) return;

    if (animRafRef.current !== null) return; // already running
    isSpringAnimatingRef.current = true;
    setIsTransitioning(true);

    const step = (ts: number) => {
      if (!isSpringAnimatingRef.current) {
        animRafRef.current = null;
        return;
      }

      const last = lastFrameTimeRef.current ?? ts;
      const dtMs = Math.min(MAX_DT_MS, Math.max(0, ts - last));
      lastFrameTimeRef.current = ts;
      const dt = dtMs / 1000;

      const x = currentXRef.current;
      const v = velocityXRef.current;
      const target = targetXRef.current;

      // Damped spring: a = k*(target-x) - c*v
      const a = (SPRING_STIFFNESS * (target - x)) - (SPRING_DAMPING * v);
      const nextV = v + (a * dt);
      const nextX = x + (nextV * dt);

      currentXRef.current = nextX;
      velocityXRef.current = nextV;
      applyTrackTransform(nextX, true);
      updateCardEffectsAtX(nextX, true, ts);
      maybeUpdateRenderIndex(nextX, ts);

      const dist = Math.abs(target - nextX);
      const vel = Math.abs(nextV);
      if (dist < SETTLE_DISTANCE_PX && vel < SETTLE_VELOCITY_PX_PER_S) {
        // Snap to exact target and stop
        currentXRef.current = target;
        velocityXRef.current = 0;
        applyTrackTransform(target, false);
        cancelSpring();
        settleAndRebaseIfNeeded();
        return;
      }

      animRafRef.current = requestAnimationFrame(step);
    };

    animRafRef.current = requestAnimationFrame(step);
  }, [
    MAX_DT_MS,
    SPRING_DAMPING,
    SPRING_STIFFNESS,
    SETTLE_DISTANCE_PX,
    SETTLE_VELOCITY_PX_PER_S,
    applyTrackTransform,
    cancelSpring,
    cardWidth,
    maybeUpdateRenderIndex,
    settleAndRebaseIfNeeded,
    updateCardEffectsAtX,
  ]);

  // OPTIMALIZACE: Vypočítat viditelný rozsah pro virtualizaci
  const getVisibleRange = useCallback(() => {
    if (cardWidth === 0 || viewportWidth === 0) {
      return { startIndex: 0, endIndex: allSlides.length - 1 };
    }
    const totalCardWidth = cardWidth + GAP;
    const visibleCount = Math.ceil(viewportWidth / totalCardWidth);
    const minIndex = Math.min(renderIndex, lastSettledIndexRef.current);
    const maxIndex = Math.max(renderIndex, lastSettledIndexRef.current);
    const startIndex = Math.max(0, minIndex - VISIBLE_BUFFER);
    const endIndex = Math.min(allSlides.length - 1, maxIndex + visibleCount + VISIBLE_BUFFER);
    return { startIndex, endIndex };
  }, [GAP, VISIBLE_BUFFER, renderIndex, cardWidth, viewportWidth, allSlides.length]);

  // Keep spring positions in sync when layout metrics change (resize / responsive breakpoint)
  useLayoutEffect(() => {
    if (!isInitialized) return;
    if (cardWidth === 0) return;

    cancelSpring();
    dragOffsetRef.current = 0;
    const x = getPositionForIndex(currentIndexRef.current);
    currentXRef.current = x;
    targetXRef.current = x;
    velocityXRef.current = 0;
    applyTrackTransform(x, false);
    updateCardEffectsAtX(x, false);
  }, [applyTrackTransform, cancelSpring, cardWidth, getPositionForIndex, isInitialized, layoutMode, updateCardEffectsAtX, viewportWidth]);

  // ============================================================================
  // POINTER EVENTS LOGIC
  // ============================================================================

  const handlePointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0 || activePointerId.current !== null) return;
      activePointerId.current = e.pointerId;

      // Stop spring immediately when user starts interacting
      cancelSpring();
      if (trackRef.current) {
        trackRef.current.style.willChange = '';
      }

      // Reset velocity tracking
      lastDragX.current = e.clientX;
      lastDragTime.current = performance.now();
      velocityRef.current = 0;

      // Stop any active wheeling session
      if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
          wheelTimeoutRef.current = null;
      }
      isWheelingRef.current = false;

      if (isResettingRef.current) return;

      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragOffsetRef.current = 0;
      dragBaseXRef.current = currentXRef.current; // direct manipulation starts from current visual position
      isClickBlockedRef.current = false;
      isDraggingRef.current = false;
      setIsTransitioning(false);
      
      targetXRef.current = currentXRef.current;
      velocityXRef.current = 0;

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
          
          // Velocity tracking
          const now = performance.now();
          const dt = now - lastDragTime.current;
          if (dt > 10) {
              const dx = e.clientX - lastDragX.current;
              velocityRef.current = dx / dt; // pixels per ms
              lastDragX.current = e.clientX;
              lastDragTime.current = now;
          }

          dragOffsetRef.current = diffX;
          if (Math.abs(diffX) > 5) isClickBlockedRef.current = true;
          
          // During direct manipulation: only update track transform (no card effects).
          if (dragRafRef.current === null) {
            dragRafRef.current = requestAnimationFrame(() => {
              const x = dragBaseXRef.current + dragOffsetRef.current;
              currentXRef.current = x;
              applyTrackTransform(x, false);
              updateCardEffectsAtX(x, true);
              maybeUpdateRenderIndex(x);
              dragRafRef.current = null;
            });
          }
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
          stopDrag(e.pointerType);
      }
      
      activePointerId.current = null;
      isDraggingRef.current = false;
      if (!isClickBlockedRef.current) setIsDragging(false);
  };

  const stopDrag = useCallback((_pointerType: string = 'mouse') => {
    // Always snap to the nearest centered position (no threshold-based "pop").
    const currentOffset = dragOffsetRef.current;
    let releaseX = dragBaseXRef.current + currentOffset;
    // Coordinate-space offset between index-based position and physical X.
    // Must be applied consistently to targetX to avoid "jumps" on very short swipes.
    let baseShift = dragBaseXRef.current - getPositionForIndex(currentIndexRef.current);

    // Start the spring from the exact visual position at release
    dragOffsetRef.current = 0;

    // Find the nearest index to the current visual center
    let desiredIndex = Math.round(estimateIndexFloatFromX(releaseX));
    desiredIndex = Math.max(0, Math.min(allSlides.length - 1, desiredIndex));

    // Keep inside safe clone window, shifting X by whole cycles invisibly if needed
    const rebased = rebaseIndexByCycles(desiredIndex);
    if (rebased.shiftPx !== 0) {
      releaseX += rebased.shiftPx;
      baseShift += rebased.shiftPx;
      dragBaseXRef.current += rebased.shiftPx;
    }

    desiredIndex = rebased.index;
    currentXRef.current = releaseX;
    applyTrackTransform(currentXRef.current, false);
    currentIndexRef.current = desiredIndex;
    setCurrentIndex(desiredIndex);
    // Keep virtualization aligned immediately after snap decision
    renderIndexRef.current = desiredIndex;
    setRenderIndex(desiredIndex);

    setIsTransitioning(true);
    targetXRef.current = getPositionForIndex(desiredIndex) + baseShift;

    // No injected velocity: premium snap is determined by position only (predictable, no pops).
    velocityXRef.current = 0;

    setIsDragging(false);
    isDraggingRef.current = false;
    startSpring();
  }, [allSlides.length, applyTrackTransform, estimateIndexFloatFromX, getPositionForIndex, rebaseIndexByCycles, startSpring]);

  const moveSlide = (direction: number) => {
      if (isDraggingRef.current) return;

      // Pokud ještě dobíhá setrvačnost z touchpadu/kolečka, zastavíme ji
      if (isWheelingRef.current) {
          isWheelingRef.current = false;
          if (wheelTimeoutRef.current) {
              clearTimeout(wheelTimeoutRef.current);
              wheelTimeoutRef.current = null;
          }
          // Reset drag stavu pro čistý start animace
          isDraggingRef.current = false;
          setIsDragging(false);
          dragOffsetRef.current = 0;
      }

      setIsTransitioning(true);
      // Keep targetX in the same coordinate space as currentX
      let baseShift = currentXRef.current - getPositionForIndex(currentIndexRef.current);
      const step = layoutMode === 'desktop' ? 3 : 1;
      let nextIndex = currentIndexRef.current + (direction * step);
      const rebased = rebaseIndexByCycles(nextIndex);
      if (rebased.shiftPx !== 0) {
        currentXRef.current += rebased.shiftPx;
        targetXRef.current += rebased.shiftPx;
        dragBaseXRef.current += rebased.shiftPx;
        applyTrackTransform(currentXRef.current, false);
        baseShift += rebased.shiftPx;
      }
      nextIndex = rebased.index;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      targetXRef.current = getPositionForIndex(nextIndex) + baseShift;
      startSpring();
  };

  // ============================================================================
  // TOUCHPAD SCROLL SUPPORT
  // ============================================================================
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
        // Only handle primarily horizontal scrolls
        // We check if horizontal scroll is dominant to avoid blocking vertical page scroll
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            // Prevent browser back/forward navigation
            if (e.cancelable) {
                e.preventDefault();
            }

            // Initialize wheeling session
            if (!isWheelingRef.current) {
                isWheelingRef.current = true;
                isDraggingRef.current = true;
                setIsDragging(true);

                cancelSpring();
                dragOffsetRef.current = 0;
                dragBaseXRef.current = currentXRef.current;
                isClickBlockedRef.current = true;
            }

            // Accumulate movement
            // deltaX > 0 means scrolling right (content moves left), so we subtract
            dragOffsetRef.current -= e.deltaX;

            // Visual update via RAF
            if (dragRafRef.current === null) {
              dragRafRef.current = requestAnimationFrame(() => {
                const x = dragBaseXRef.current + dragOffsetRef.current;
                currentXRef.current = x;
                applyTrackTransform(x, false);
                updateCardEffectsAtX(x, true);
              maybeUpdateRenderIndex(x);
                dragRafRef.current = null;
              });
            }

            // Debounce stop
            if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
            
            wheelTimeoutRef.current = setTimeout(() => {
                isWheelingRef.current = false;
                stopDrag('mouse'); // Wheel považujeme za mouse/touchpad
            }, 60); 
        }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        element.removeEventListener('wheel', handleWheel);
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [applyTrackTransform, cancelSpring, getPositionForIndex, stopDrag]);

  // ============================================================================
  // JSX
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full select-none" style={{ opacity: isInitialized ? 1 : 0, transition: 'opacity 0.3s ease-in' }}>
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
                                            tags={item.product.tags}
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

      {/* Controls Container */}
      <div className="relative mt-2 flex items-center justify-center">
        {/* Indikátor pozice (Infografika) */}
        <div className="flex justify-center items-center gap-1.5 z-20">
          {products.map((_, index) => (
            <div
              key={index}
              className={`transition-all duration-300 ease-out ${
                index === currentProductIndex
                  ? 'w-6 h-1 bg-[#502038] rounded-full'
                  : 'w-1.5 h-1.5 bg-[#502038]/20 rounded-full'
              }`}
            />
          ))}
        </div>

        {/* Navigace vpravo dole */}
        <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 gap-3 z-20">
          <button 
            onClick={() => moveSlide(-1)} 
            className="group bg-[#502038]/20 hover:bg-[#502038] text-[#502038] hover:text-white p-2.5 rounded-full shadow-sm transition-all active:scale-95"
            aria-label="Předchozí"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={() => moveSlide(1)} 
            className="group bg-[#502038]/20 hover:bg-[#502038] text-[#502038] hover:text-white p-2.5 rounded-full shadow-sm transition-all active:scale-95"
            aria-label="Další"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCarousel;