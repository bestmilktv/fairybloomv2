import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  // Grid fallback pro ≤3 produkty
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
  // INFINITE LOOP: Klonování produktů
  // ============================================================================
  // Struktura: [...KlonovanéPoložkyKonec, ...OriginálníPoložky, ...KlonovanéPoložkyZačátek]
  // Klony na začátku = konec originálů (pro swipe doleva)
  // Klony na konci = začátek originálů (pro swipe doprava)
  // Počet klonů: alespoň 2 sady produktů na každou stranu (2 * products.length)
  const CLONE_COUNT = 2 * products.length;
  const clonedProducts = useMemo(() => [
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products), // Klony konce (na začátku)
    ...products, // Originální produkty
    ...Array(CLONE_COUNT).fill(null).flatMap(() => products), // Klony začátku (na konci)
  ], [products]);

  // ============================================================================
  // REFS A STATE
  // ============================================================================
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastTargetIndexRef = useRef<number | null>(null); // Uloží targetIndex z handleEnd pro použití v handleTransitionEnd
  const visibleProductsRef = useRef<{ centerIndex: number, productIds: string[] } | null>(null); // Uloží informace o viditelných produktech
  
  const [currentIndex, setCurrentIndex] = useState(CLONE_COUNT * products.length);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [gap, setGap] = useState(16); // Fixní gap 16px podle specifikace
  const [isDesktop, setIsDesktop] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  // ============================================================================
  // MĚŘENÍ ROZMĚRŮ A RESPONZIVITA
  // ============================================================================
  useEffect(() => {
    if (!viewportRef.current) return;

    const updateDimensions = () => {
      if (!viewportRef.current) return;
      
      const width = viewportRef.current.offsetWidth;
      setViewportWidth(width);
      const desktop = width >= 1024; // Breakpoint podle specifikace
      setIsDesktop(desktop);
      
      if (desktop) {
        // Desktop (>= 1024px): 5 karet (3 hlavní + 2 boční) + 4 gapy (16px)
        // cardWidth = (viewportWidth - 4 * 16) / 5
        const calculatedCardWidth = (width - (4 * gap)) / 5;
        setCardWidth(calculatedCardWidth);
      } else {
        // Mobil (< 768px) nebo Tablet (768-1023px): 1 hlavní karta
        // cardWidth = viewportWidth - 32px (16px gap na každé straně pro peek)
        const calculatedCardWidth = width - 32;
        setCardWidth(calculatedCardWidth);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [gap]);

  // ============================================================================
  // INFINITE LOOP RESET
  // ============================================================================
  // Konstanty pro infinite loop reset
  const CLONES_AT_START = CLONE_COUNT * products.length; // Počet klonů na začátku pole
  const realLength = products.length; // Počet originálních produktů
  
  // Helper funkce pro výpočet realIndex z visualIndex
  // Převádí index v klonovaném poli na index originálního produktu
  const getRealIndex = useCallback((visualIndex: number): number => {
    // Použijeme robustní modulo pro záporná čísla
    let normalizedIndex = (visualIndex - CLONES_AT_START) % realLength;
    if (normalizedIndex < 0) normalizedIndex += realLength;
    return normalizedIndex;
  }, [CLONES_AT_START, realLength]);

  // Helper funkce pro nalezení indexu produktu v originální sadě podle product.id
  const findProductIndexInOriginals = useCallback((productId: string): number => {
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        return i;
      }
    }
    return -1; // Produkt nenalezen
  }, [products]);

  // Helper funkce pro nalezení indexu v clonedProducts, který zobrazí daný produkt na dané pozici
  // centerProductId = id produktu, který má být uprostřed
  // Vrací index v clonedProducts, který zobrazí tento produkt uprostřed
  const findIndexForCenterProduct = useCallback((centerProductId: string): number => {
    // Najdeme index produktu v originální sadě
    const originalIndex = findProductIndexInOriginals(centerProductId);
    if (originalIndex === -1) return CLONES_AT_START; // Fallback
    
    // Vrátíme index v originální sadě (uprostřed)
    return CLONES_AT_START + originalIndex;
  }, [findProductIndexInOriginals, CLONES_AT_START]);

  // Cleanup po dokončení animace
  // Protože handleEnd už normalizuje targetIndex na originály, zde pouze kontrolujeme a čistíme
  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    // Zkontrolujeme, že se jedná o transition na track elementu, ne na kartách
    if (e.target !== trackRef.current) return;
    
    // Zkontrolujeme, že animace skutečně skončila a nejsme v dragu
    if (isDragging || isTransitioning || cardWidth === 0 || viewportWidth === 0 || !trackRef.current) return;

    // Zkontrolujeme, že jsme v originálech (což bychom měli být, protože handleEnd už normalizuje)
    const isInOriginals = currentIndex >= CLONES_AT_START && currentIndex < (CLONES_AT_START + realLength);
    
    // Debugging
    console.log('handleTransitionEnd:', {
      currentIndex,
      isInOriginals,
      CLONES_AT_START,
      realLength
    });

    // Pokud nejsme v originálech (což by nemělo nastat), použijeme fallback
    if (!isInOriginals) {
      let normalizedIndex = (currentIndex - CLONES_AT_START) % realLength;
      if (normalizedIndex < 0) normalizedIndex += realLength;
      const safeTargetIndex = CLONES_AT_START + normalizedIndex;
      
      if (currentIndex !== safeTargetIndex) {
        setIsTransitioning(false);
        setCurrentIndex(safeTargetIndex);
      } else {
        setIsTransitioning(false);
      }
    } else {
      // Jsme v originálech, což je správně - pouze vyčistíme refy
      setIsTransitioning(false);
    }
    
    // Vyčistíme refy po použití
    visibleProductsRef.current = null;
    lastTargetIndexRef.current = null;
  }, [isDragging, isTransitioning, cardWidth, viewportWidth, CLONES_AT_START, realLength, currentIndex]);

  // Také kontrolujeme při změně indexu (pro případy bez transition)
  // Resetujeme pouze když animace skutečně skončila a nejsme v dragu
  useEffect(() => {
    if (isTransitioning || isDragging || cardWidth === 0 || viewportWidth === 0) return;

    const totalProducts = products.length;
    const startOfOriginals = CLONE_COUNT * totalProducts;
    const endOfOriginals = startOfOriginals + totalProducts - 1;

    // Pokud jsme už v originálech, nic neděláme
    if (currentIndex >= startOfOriginals && currentIndex <= endOfOriginals) {
      return;
    }

    // Použijeme uložené viditelné produkty, pokud existují
    const visibleProducts = visibleProductsRef.current;
    if (visibleProducts) {
      // Najdeme index prostředního produktu v originální sadě
      const centerProductId = isDesktop && visibleProducts.productIds.length >= 3 
        ? visibleProducts.productIds[1]
        : visibleProducts.productIds[0];
      
      let normalizedIndex = -1;
      for (let i = 0; i < products.length; i++) {
        if (products[i].id === centerProductId) {
          normalizedIndex = i;
          break;
        }
      }
      
      if (normalizedIndex === -1) {
        let fallbackNormalizedIndex = (visibleProducts.centerIndex - CLONES_AT_START) % realLength;
        if (fallbackNormalizedIndex < 0) fallbackNormalizedIndex += realLength;
        normalizedIndex = fallbackNormalizedIndex;
      }
      
      const safeTargetIndex = startOfOriginals + normalizedIndex;
      
      if (currentIndex !== safeTargetIndex) {
        setIsTransitioning(false);
        requestAnimationFrame(() => {
          setCurrentIndex(safeTargetIndex);
        });
      }
      visibleProductsRef.current = null;
      lastTargetIndexRef.current = null;
      return;
    }

    // Fallback: vypočítáme realIndex z aktuálního currentIndex
    const realIndex = getRealIndex(currentIndex);
    
    // Vypočítáme cílový index v originální sadě
    const targetIndex = startOfOriginals + realIndex;

    // Zkontroluj, zda už nejsme na správném indexu (aby se předešlo nekonečné smyčce)
    if (currentIndex === targetIndex) {
      return;
    }

    // Okamžitě (bez transition) přesuneme na targetIndex
    setIsTransitioning(false);
    requestAnimationFrame(() => {
      setCurrentIndex(targetIndex);
    });
  }, [currentIndex, products.length, isTransitioning, isDragging, cardWidth, viewportWidth, getRealIndex, CLONES_AT_START, realLength, products, isDesktop]);

  // ============================================================================
  // NAVIGACE
  // ============================================================================
  const goToIndex = useCallback((newIndex: number, withTransition = true) => {
    if (isTransitioning && !isDragging) return;
    
    setIsTransitioning(withTransition);
    setCurrentIndex(newIndex);
    
    // isTransitioning se resetuje v handleTransitionEnd() když CSS transition skutečně skončí
    // setTimeout je zde jako fallback pro případy, kdy se handleTransitionEnd nevolá
    if (withTransition) {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }
  }, [isTransitioning, isDragging]);

  const nextSlide = useCallback(() => {
    if (!viewportRef.current) return;
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const desktop = viewportWidth >= 1024;
    
    // Desktop (>= 1024px): posun o 3 produkty
    // Mobil (< 768px): posun o 1 produkt
    const step = desktop ? 3 : 1;
    goToIndex(currentIndex + step);
  }, [currentIndex, goToIndex]);

  const prevSlide = useCallback(() => {
    if (!viewportRef.current) return;
    
    const viewportWidth = viewportRef.current.offsetWidth;
    const desktop = viewportWidth >= 1024;
    
    // Desktop (>= 1024px): posun o 3 produkty
    // Mobil (< 768px): posun o 1 produkt
    const step = desktop ? 3 : 1;
    goToIndex(currentIndex - step);
  }, [currentIndex, goToIndex]);

  // ============================================================================
  // SWIPE/DRAG HANDLING
  // ============================================================================
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragStartTime(Date.now());
    setDragStartIndex(currentIndex);
    setDragOffset(0);
    setIsTransitioning(false);
  }, [currentIndex]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || cardWidth === 0) return;
    
    const offset = clientX - dragStart;
    const totalCardWidth = cardWidth + gap;
    
    // Vypočítáme, na jaký index bychom se přesunuli
    const cardsMoved = offset / totalCardWidth;
    const potentialIndex = dragStartIndex + cardsMoved;
    
    // Kontrola infinite loop - pokud jsme mimo hranice, okamžitě resetujeme
    const totalProducts = products.length;
    const startOfOriginals = CLONE_COUNT * totalProducts;
    const endOfOriginals = startOfOriginals + totalProducts - 1;
    
    // Pokud bychom byli na konci klonů vpravo, resetujeme na začátek originálů
    if (potentialIndex >= endOfOriginals + totalProducts) {
      const newDragStartIndex = startOfOriginals;
      const newDragOffset = offset - ((newDragStartIndex - dragStartIndex) * totalCardWidth);
      setDragStartIndex(newDragStartIndex);
      setDragOffset(newDragOffset);
      return;
    }
    
    // Pokud bychom byli na začátku klonů vlevo, resetujeme na konec originálů
    if (potentialIndex < startOfOriginals - totalProducts) {
      const newDragStartIndex = endOfOriginals;
      const newDragOffset = offset - ((newDragStartIndex - dragStartIndex) * totalCardWidth);
      setDragStartIndex(newDragStartIndex);
      setDragOffset(newDragOffset);
      return;
    }
    
    setDragOffset(offset);
  }, [isDragging, dragStart, cardWidth, gap, dragStartIndex, products.length]);

  const handleEnd = useCallback(() => {
    if (!isDragging || cardWidth === 0 || viewportWidth === 0 || !trackRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const totalCardWidth = cardWidth + gap;
    
    // Vypočítáme rawIndex přímo z dragStartIndex a dragOffset (přesnější než z DOM)
    // dragOffset je v pixelech, převedeme na počet karet
    const cardsMoved = dragOffset / totalCardWidth;
    const rawIndex = Math.round(dragStartIndex + cardsMoved);
    
    // Zohledníme rychlost/směr swipu
    const dragDuration = Date.now() - dragStartTime;
    const dragDistance = Math.abs(dragOffset);
    const dragVelocity = dragDistance / Math.max(dragDuration, 1); // px/ms
    
    // Threshold pro přepnutí
    const distanceThreshold = cardWidth * 0.3;
    const velocityThreshold = 0.5;
    
    let targetIndex: number;
    
    // Pokud je rychlost vysoká a vzdálenost dostatečná, posuneme o 1 kartu ve směru swipu
    if (dragVelocity > velocityThreshold && dragDistance > distanceThreshold) {
      const direction = dragOffset > 0 ? -1 : 1; // Pozitivní dragOffset = táhneme doprava = posun doleva
      targetIndex = rawIndex + direction;
    } else {
      // Jinak použijeme rawIndex pro přesný snap
      targetIndex = rawIndex;
    }
    
    // KLÍČOVÉ: Nejdřív zjistíme, které produkty jsou viditelné na targetIndex (i když je v klonech)
    // Desktop: 3 hlavní karty [targetIndex-1, targetIndex, targetIndex+1]
    // Mobil: 1 hlavní karta [targetIndex]
    const visibleIndices: number[] = [];
    if (isDesktop) {
      visibleIndices.push(targetIndex - 1, targetIndex, targetIndex + 1);
    } else {
      visibleIndices.push(targetIndex);
    }
    
    // Získáme productIds z těchto indexů (z clonedProducts, i když jsou to klony)
    const productIds = visibleIndices
      .filter(idx => idx >= 0 && idx < clonedProducts.length)
      .map(idx => clonedProducts[idx].id);
    
    // Najdeme prostřední produkt (nebo hlavní produkt na mobilu)
    const centerProductId = isDesktop && productIds.length >= 3 
      ? productIds[1]  // Desktop: prostřední ze 3
      : productIds[0];  // Mobil: první (a jediný)
    
    // Najdeme index tohoto produktu v originální sadě
    const centerProductOriginalIndex = findProductIndexInOriginals(centerProductId);
    
    // Pokud jsme produkt nenašli, použijeme fallback výpočet
    let normalizedTargetIndex: number;
    if (centerProductOriginalIndex === -1) {
      // Fallback: použijeme matematický výpočet
      let normalizedIndex = (targetIndex - CLONES_AT_START) % realLength;
      if (normalizedIndex < 0) normalizedIndex += realLength;
      normalizedTargetIndex = CLONES_AT_START + normalizedIndex;
    } else {
      // Použijeme index z originální sady - to zajistí, že se zobrazí stejné produkty
      normalizedTargetIndex = CLONES_AT_START + centerProductOriginalIndex;
    }
    
    // Uložíme informace o viditelných produktech
    visibleProductsRef.current = {
      centerIndex: normalizedTargetIndex,
      productIds: productIds
    };
    
    // Uložíme také normalizovaný targetIndex do ref
    lastTargetIndexRef.current = normalizedTargetIndex;
    
    // Debugging
    console.log('handleEnd:', {
      dragStartIndex,
      dragOffset,
      cardsMoved,
      rawIndex,
      originalTargetIndex: targetIndex,
      centerProductId,
      centerProductOriginalIndex,
      normalizedTargetIndex,
      visibleIndices,
      productIds
    });
    
    // Nastavíme cíl a zapneme plynulou transition - už v originálech se stejnými produkty!
    goToIndex(normalizedTargetIndex, true);
    setIsDragging(false);
    
    // Reset dragOffset po dokončení animace
    setTimeout(() => {
      setDragOffset(0);
    }, 600);
  }, [isDragging, dragOffset, dragStartIndex, cardWidth, gap, dragStartTime, goToIndex, viewportWidth, isDesktop, clonedProducts, CLONES_AT_START, realLength, findProductIndexInOriginals]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Global mouse events pro drag mimo komponentu
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // ============================================================================
  // OPTIMALIZACE: Cache viewportCenter
  // ============================================================================
  const viewportCenter = useMemo(() => viewportWidth / 2, [viewportWidth]);

  // ============================================================================
  // VÝPOČET TRANSFORM POZICE
  // ============================================================================
  // currentIndex reprezentuje PROSTŘEDNÍ ze tří hlavních karet (desktop) nebo hlavní kartu (mobil)
  // Algoritmus: totalCardWidth = cardWidth + gap, centerOffset = (viewportWidth - cardWidth) / 2
  // x = -(currentIndex * totalCardWidth) + centerOffset
  const calculateTransform = () => {
    if (cardWidth === 0 || viewportWidth === 0) return 'translateX(0)';
    
    const totalCardWidth = cardWidth + gap;
    
    // Během dragu používáme dragStartIndex pro plynulý pohyb 1:1
    const baseIndex = isDragging ? dragStartIndex : currentIndex;
    
    // Centrovací offset: karta má být uprostřed viewportu
    // centerOffset = (viewportWidth - cardWidth) / 2
    const centerOffset = (viewportWidth - cardWidth) / 2;
    
    // Finální pozice: x = -(currentIndex * totalCardWidth) + centerOffset + dragOffset
    const x = -(baseIndex * totalCardWidth) + centerOffset + dragOffset;
    
    return `translateX(${x}px)`;
  };

  // ============================================================================
  // URČENÍ STYLU KARTY - Distance-Based Interpolace
  // ============================================================================
  // Vypočítá styly na základě aktuální fyzické pozice karty vůči středu viewportu
  // Během dragu se karty plynule transformují (scale, opacity) podle jejich pozice
  const getCardStyle = (index: number) => {
    if (cardWidth === 0 || viewportWidth === 0) {
      return {
        width: '0px',
        opacity: 0,
        transform: 'scale(0.85)',
      };
    }

    const totalCardWidth = cardWidth + gap;
    
    // Během dragu používáme dragStartIndex, jinak currentIndex
    const baseIndex = isDragging ? dragStartIndex : currentIndex;
    
    // Vypočítáme aktuální transform tracku
    const centerOffset = (viewportWidth - cardWidth) / 2;
    const trackX = -(baseIndex * totalCardWidth) + centerOffset + dragOffset;
    
    // Vypočítáme střed této karty v pixelech (v viewportu)
    // Pozice karty v tracku: index * totalCardWidth
    // Střed karty: trackX + (index * totalCardWidth) + (cardWidth / 2)
    const cardCenter = trackX + (index * totalCardWidth) + (cardWidth / 2);
    
    // Vypočítáme distance od středu viewportu
    const distance = Math.abs(viewportCenter - cardCenter);
    
    // Transition pouze když není drag a je transition
    const transition = isTransitioning && !isDragging ? 'opacity 500ms ease-out, transform 500ms ease-out' : 'none';
    
    if (isDesktop) {
      // Desktop: layout [Small] [Large] [Large] [Large] [Small]
      // Hlavní zóna: 3 karty uprostřed (cca 1.5 * totalCardWidth od středu)
      // Boční zóna: 2 karty po stranách (cca 2.5 * totalCardWidth od středu)
      
      // Hlavní zóna: distance < 1.5 * totalCardWidth -> scale 1, opacity 1
      // Boční zóna: 1.5 * totalCardWidth <= distance < 2.5 * totalCardWidth -> scale 0.85, opacity 0.5
      // Mimo: distance >= 2.5 * totalCardWidth -> scale a opacity klesají
      
      const mainZoneDistance = 1.5 * totalCardWidth;
      const sideZoneDistance = 2.5 * totalCardWidth;
      
      let scale: number;
      let opacity: number;
      
      if (distance < mainZoneDistance) {
        // Hlavní zóna - plná velikost
        scale = 1;
        opacity = 1;
      } else if (distance < sideZoneDistance) {
        // Boční zóna - interpolace mezi hlavní a boční
        const t = (distance - mainZoneDistance) / (sideZoneDistance - mainZoneDistance);
        scale = 1 - (t * 0.15); // 1 -> 0.85
        opacity = 1 - (t * 0.5); // 1 -> 0.5
      } else {
        // Mimo hlavní strukturu - klesající hodnoty
        const extraDistance = distance - sideZoneDistance;
        const fadeFactor = Math.min(1, extraDistance / totalCardWidth);
        scale = Math.max(0.7, 0.85 - fadeFactor * 0.15);
        opacity = Math.max(0, 0.5 - fadeFactor * 0.2);
      }
      
      return {
        width: `${cardWidth}px`,
        opacity,
        transform: `scale(${scale})`,
        transition,
      };
    } else {
      // Mobil: hlavní karta uprostřed, ostatní se zmenšují
      // Hlavní zóna: distance < cardWidth / 2 -> scale 1, opacity 1
      const mainZoneDistance = cardWidth / 2;
      
      let scale: number;
      let opacity: number;
      
      if (distance < mainZoneDistance) {
        // Hlavní karta
        scale = 1;
        opacity = 1;
      } else {
        // Ostatní karty - interpolace podle distance
        const extraDistance = distance - mainZoneDistance;
        const fadeFactor = Math.min(1, extraDistance / (cardWidth * 1.5));
        scale = Math.max(0.7, 1 - fadeFactor * 0.3);
        opacity = Math.max(0.3, 1 - fadeFactor * 0.7);
      }
      
      return {
        width: `${cardWidth}px`,
        opacity,
        transform: `scale(${scale})`,
        transition,
      };
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div 
      ref={wrapperRef}
      className="relative w-full"
      style={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Carousel Viewport - skryje části mimo viditelnou oblast */}
      <div
        ref={viewportRef}
        className="relative w-full"
        style={{
          overflow: 'hidden',
          touchAction: 'pan-x',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Carousel Track */}
        <div
          ref={trackRef}
          className="flex flex-row flex-nowrap"
          style={{
            display: 'flex',
            width: 'max-content',
            gap: `${gap}px`,
            transform: calculateTransform(),
            transition: isTransitioning && !isDragging ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            willChange: isDragging ? 'transform' : 'auto',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {clonedProducts.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="flex-shrink-0"
              style={getCardStyle(index)}
            >
              <Link 
                to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`} 
                className="group cursor-pointer block h-full"
                draggable={false}
              >
                <div className="transition-transform duration-300 ease-in-out hover:scale-105 h-full">
                  <ProductCard
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    description={product.description}
                    inventoryQuantity={product.inventoryQuantity}
                  />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 -translate-y-1/2 left-2 md:left-4 lg:-left-12 z-30
                   w-10 h-10 md:w-12 md:h-12 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
        aria-label="Předchozí produkty"
      >
        <svg 
          className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 lg:-right-12 z-30
                   w-10 h-10 md:w-12 md:h-12 rounded-full
                   bg-background/90 backdrop-blur-sm border border-border/50
                   flex items-center justify-center
                   hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20
                   transition-all duration-300 ease-in-out
                   group"
        aria-label="Další produkty"
      >
        <svg 
          className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default ProductCarousel;
