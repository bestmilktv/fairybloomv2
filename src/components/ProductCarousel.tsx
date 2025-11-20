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
  // ============================================================================
  // GRID FALLBACK (pro málo produktů)
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
  // KONFIGURACE A DATA
  // ============================================================================
  const GAP = 16;
  const CLONE_COUNT = 2 * products.length; // Dostatek klonů na obě strany
  
  // Příprava dat: [KlonyKonec, ...Originály, ...KlonyZačátek]
  const allSlides = useMemo(() => {
    const slides: Array<{ product: Product; isClone: boolean; originalIndex: number }> = [];
    
    // 1. Klony konce (vlevo)
    for (let i = 0; i < CLONE_COUNT; i++) {
       // Bereme produkty od konce dokola
       const productIndex = (products.length - 1 - (i % products.length)); 
       // Ale pro renderování pole je chceme v pořadí zleva doprava, takže musíme pole otočit nebo skládat jinak.
       // Jednodušší logika klonování celých sad:
    }
    
    // ZJEDNODUŠENÁ LOGIKA KLONOVÁNÍ:
    // Vytvoříme pole originálů
    const originals = products.map((p, i) => ({ product: p, isClone: false, originalIndex: i }));
    
    // Klony před (kopie celého pole products tolikrát, kolik je potřeba)
    const clonesBefore = [];
    for(let i = 0; i < CLONE_COUNT; i++) {
        const p = products[products.length - 1 - (i % products.length)];
        // Pozor: chceme zachovat správné pořadí visualně. 
        // Nejjednodušší je vzít celé sady.
    }

    // RESTART LOGIKY DAT - Aby to bylo 100% neprůstřelné:
    const items = [];
    
    // A) Klony vlevo (poslední produkty z pole)
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = (products.length - 1 - (i % products.length));
        items.unshift({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }

    // B) Originály
    products.forEach((p, i) => {
        items.push({ product: p, isClone: false, originalIndex: i });
    });

    // C) Klony vpravo (první produkty z pole)
    for (let i = 0; i < CLONE_COUNT; i++) {
        const sourceIndex = i % products.length;
        items.push({ product: products[sourceIndex], isClone: true, originalIndex: sourceIndex });
    }

    return items;
  }, [products, CLONE_COUNT]);

  // Startovní index (první originál)
  const START_INDEX = CLONE_COUNT; 

  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Dimensions
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // Refs pro zamezení smyček
  const isResettingRef = useRef(false); 
  const dragStartTime = useRef(0);

  // ============================================================================
  // RESPONZIVITA & ROZMĚRY
  // ============================================================================
  useEffect(() => {
    if (!wrapperRef.current) return;

    const updateDimensions = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.offsetWidth;
      setViewportWidth(width);
      
      const desktop = width >= 1024;
      setIsDesktop(desktop);

      let newCardWidth;
      if (desktop) {
        // Desktop: 5 viditelných (3 hlavní + 2 boční kousky)
        // Formula: (viewport - 4 * gap) / 5
        newCardWidth = (width - (4 * GAP)) / 5;
      } else {
        // Mobil: 1 hlavní + peek
        newCardWidth = width - 32; 
      }
      setCardWidth(newCardWidth);
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapperRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // ============================================================================
  // CORE LOGIC: TELEPORTACE (Infinite Loop Reset)
  // ============================================================================
  const handleTransitionEnd = () => {
    if (!trackRef.current || isDragging) return;

    // 1. Zjistíme, co je právě uprostřed (DOM měření, žádná matematika indexů)
    const track = trackRef.current;
    const parent = track.parentElement;
    if (!parent) return;

    const parentCenter = parent.getBoundingClientRect().left + (parent.offsetWidth / 2);
    
    let closestElement: HTMLElement | null = null;
    let minDist = Infinity;

    // Projdeme všechny děti a najdeme to nejblíže středu
    Array.from(track.children).forEach((child) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const childCenter = rect.left + (rect.width / 2);
        const dist = Math.abs(parentCenter - childCenter);
        if (dist < minDist) {
            minDist = dist;
            closestElement = child as HTMLElement;
        }
    });

    if (!closestElement) return;

    // 2. Identifikace
    const type = closestElement.dataset.type;
    const productId = closestElement.dataset.productId;

    // Pokud jsme na originálu, je to OK, jen srovnáme state
    if (type === 'original') {
        const index = parseInt(closestElement.dataset.index || '0');
        if (index !== currentIndex) {
            setIsTransitioning(false);
            setCurrentIndex(index);
        }
        return;
    }

    // 3. Pokud jsme na klonu -> TELEPORT
    if (type === 'clone' && productId) {
        // Najdeme originál se stejným ID
        const originalElement = Array.from(track.children).find(
            child => (child as HTMLElement).dataset.type === 'original' && 
                     (child as HTMLElement).dataset.productId === productId
        ) as HTMLElement;

        if (originalElement) {
            const originalIndex = parseInt(originalElement.dataset.index || '0');
            
            // Výpočet pozice originálu
            const totalCardWidth = cardWidth + GAP;
            const centerOffset = (viewportWidth - cardWidth) / 2;
            const newX = -(originalIndex * totalCardWidth) + centerOffset;

            // APLIKACE TELEPORTU
            isResettingRef.current = true; // Zablokujeme useEffect
            
            track.style.transition = 'none';
            track.style.transform = `translateX(${newX}px)`;
            
            // Force Reflow (nutné pro aplikaci změny bez animace)
            void track.offsetHeight;

            setCurrentIndex(originalIndex);
            setIsTransitioning(false);

            // Odblokování v dalším frame
            requestAnimationFrame(() => {
                track.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => {
                    isResettingRef.current = false;
                }, 50);
            });
        }
    }
  };

  // ============================================================================
  // GESTA (Swipe/Drag)
  // ============================================================================
  const handleStart = (clientX: number) => {
    if (isTransitioning) return; // Blokace během animace (volitelné)
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
    dragStartTime.current = Date.now();
    
    // Vypneme transition pro okamžitou reakci
    if (trackRef.current) {
        trackRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - dragStart;
    setDragOffset(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Logika pro snap (přichycení)
    const totalCardWidth = cardWidth + GAP;
    const movedCards = -dragOffset / totalCardWidth; // Kolik karet jsme posunuli (float)
    
    // Detekce "švihnutí" (flick)
    const time = Date.now() - dragStartTime.current;
    const velocity = Math.abs(dragOffset) / time;
    const isFlick = velocity > 0.5 && Math.abs(dragOffset) > 50;

    let targetIndexDiff = Math.round(movedCards);

    if (isFlick) {
        // Pokud švihnul, posuneme alespoň o 1, i když nedtáhl polovinu
        targetIndexDiff = dragOffset > 0 ? -1 : 1;
    }

    const newIndex = currentIndex + targetIndexDiff;

    // Aplikace pohybu
    setIsTransitioning(true);
    setCurrentIndex(newIndex);
    setDragOffset(0);
    
    // Transition se zapne zpět v render loopu nebo zde
    if (trackRef.current) {
        trackRef.current.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)';
    }
  };

  // Šipky
  const moveSlide = (dir: number) => {
    if (isTransitioning) return;
    const step = isDesktop ? 3 : 1;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + (dir * step));
  };

  // ============================================================================
  // STYLY & RENDER HELPERY
  // ============================================================================
  const getTransform = () => {
    if (cardWidth === 0) return 'translateX(0px)';
    const totalCardWidth = cardWidth + GAP;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    
    // Base pozice podle indexu + aktuální drag offset
    const currentPos = -(currentIndex * totalCardWidth) + centerOffset + dragOffset;
    return `translateX(${currentPos}px)`;
  };

  // Distance-based styling (Morph efekt)
  const getCardStyle = (index: number) => {
    if (cardWidth === 0) return {};

    const totalCardWidth = cardWidth + GAP;
    const centerOffset = (viewportWidth - cardWidth) / 2;
    
    // Kde je track teď
    const trackPos = -(currentIndex * totalCardWidth) + centerOffset + dragOffset;
    
    // Kde je střed této karty
    const cardLeft = trackPos + (index * totalCardWidth);
    const cardCenter = cardLeft + (cardWidth / 2);
    const viewportCenter = viewportWidth / 2;

    // Vzdálenost od středu
    const dist = Math.abs(viewportCenter - cardCenter);
    
    // Logika zmenšování
    let scale = 1;
    let opacity = 1;

    if (isDesktop) {
        // Desktop: [S] [L] [L] [L] [S]
        // 3 karty uprostřed jsou "Main Zone"
        const mainZone = totalCardWidth * 1.5; 
        if (dist > mainZone) {
            // Jsme v boční zóně -> zmenšujeme
            const diff = dist - mainZone;
            const factor = Math.min(1, diff / totalCardWidth); // 0 až 1
            scale = 1 - (factor * 0.15); // klesne na 0.85
            opacity = 1 - (factor * 0.5); // klesne na 0.5
        }
    } else {
        // Mobil: [s] [L] [s]
        // 1 karta uprostřed je Main
        const mainZone = totalCardWidth * 0.5;
        if (dist > mainZone) {
             const diff = dist - mainZone;
             const factor = Math.min(1, diff / totalCardWidth);
             scale = 1 - (factor * 0.15);
             opacity = 1 - (factor * 0.5);
        }
    }

    return {
        width: `${cardWidth}px`,
        transform: `scale(${scale})`,
        opacity: opacity,
        transition: isDragging ? 'none' : 'transform 500ms ease-out, opacity 500ms ease-out'
    };
  };

  // Event Wrappers
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientX); };
  const onMouseMove = (e: React.MouseEvent) => { if(isDragging) { e.preventDefault(); handleMove(e.clientX); } };
  const onMouseUp = () => handleEnd();

  // Global mouse up hook
  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('mousemove', (e) => handleMove(e.clientX));
    }
    return () => {
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('mousemove', (e) => handleMove(e.clientX)); // Cleanup fix
    };
  }, [isDragging]);


  // ============================================================================
  // JSX RENDER
  // ============================================================================
  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden group">
      <div 
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={handleEnd}
      >
        <div
            ref={trackRef}
            className="flex flex-row"
            style={{
                gap: `${GAP}px`,
                width: 'max-content',
                transform: getTransform(),
                transition: isDragging ? 'none' : 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
            }}
            onTransitionEnd={handleTransitionEnd}
        >
            {allSlides.map((item, i) => {
                // ATOMOVÉ ID: Unikátní klíč složený z typu a indexu.
                // React se díky tomu nikdy nesplete.
                const uniqueKey = `${item.isClone ? 'clone' : 'orig'}-${item.product.id}-${i}`;
                
                return (
                    <div 
                        key={uniqueKey}
                        // Data atributy pro "Find & Teleport" logiku
                        data-product-id={item.product.id}
                        data-type={item.isClone ? 'clone' : 'original'}
                        data-index={i}
                        className="flex-shrink-0"
                        style={getCardStyle(i)}
                    >
                        <div className="h-full pointer-events-none"> 
                        {/* pointer-events-none uvnitř při dragu zabrání zaseknutí na Linku */}
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