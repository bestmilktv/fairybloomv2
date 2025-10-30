import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { createProductPath } from '@/lib/slugify';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

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

// Legacy desktop carousel (original 5-cards layout with custom transform)
const LegacyDesktopCarousel = ({ products }: ProductCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const createInfiniteProducts = () => {
    const repeatedProducts: Product[] = [];
    for (let i = 0; i < 10; i++) {
      repeatedProducts.push(...products);
    }
    return repeatedProducts;
  };

  const extendedProducts = useMemo(() => createInfiniteProducts(), [products]);

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 3);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 3);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  const calculateTransform = () => {
    const cardWidth = 320;
    const gap = 32;
    const totalWidth = cardWidth + gap;
    const offset = (currentIndex - 1) * totalWidth;
    return `translateX(-${offset}px)`;
  };

  return (
    <div className="relative w-full flex justify-center">
      <div className="relative" style={{ width: '1728px', maxWidth: '90vw' }}>
        <div className="overflow-hidden">
          <div
            className="flex gap-8"
            style={{
              transform: calculateTransform(),
              transition: isTransitioning ? 'transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
          >
            {extendedProducts.map((product, index) => {
              const relativePosition = index - currentIndex;
              const isMainProduct = relativePosition >= 0 && relativePosition <= 2;
              const isSideProduct = relativePosition === -1 || relativePosition === 3;
              const isVisible = relativePosition >= -1 && relativePosition <= 3;

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex-shrink-0"
                  style={{
                    width: '320px',
                    opacity: isMainProduct ? 1 : isSideProduct ? 0.5 : 0,
                    transform: isMainProduct ? 'scale(1)' : isSideProduct ? 'scale(0.7)' : 'scale(0.6)',
                    transition: isTransitioning ? 'transform 1000ms ease-out, opacity 1000ms ease-out' : 'none',
                    visibility: isVisible ? 'visible' : 'hidden',
                  }}
                >
                  <Link
                    to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`}
                    className="group cursor-pointer block"
                  >
                    <div className="transition-transform duration-300 ease-in-out hover:scale-105">
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
              );
            })}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute -left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 ease-in-out group"
          aria-label="Předchozí produkty"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-gold transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className="absolute -right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-gold/50 hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 ease-in-out group"
          aria-label="Další produkty"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-gold transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const ProductCarousel = ({ products }: ProductCarouselProps) => {
  const [embla, setEmbla] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // Determine visible items count per breakpoint
  const visibleCount = useMemo(() => {
    if (viewportWidth < 768) return 1; // mobile
    if (viewportWidth < 1024) return 2; // tablet
    if (viewportWidth < 1280) return 3; // small notebook
    if (viewportWidth < 1536) return 4; // desktop
    return 5; // large desktop
  }, [viewportWidth]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelectedIndex(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  // If we have 3 or fewer products, show them in a simple grid
  if (products.length <= 3) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product, index) => (
          <div key={product.id} className={`fade-in-up-delayed`} style={{ animationDelay: `${index * 0.1}s` }}>
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

  // Large desktop: restore legacy layout exactly
  if (viewportWidth >= 1536) {
    return <LegacyDesktopCarousel products={products} />;
  }

  // Neighbors for side highlighting
  const total = products.length;
  const prevIndex = (selectedIndex - 1 + total) % total;
  const nextIndex = (selectedIndex + 1) % total;

  return (
    <div className="relative w-full">
      <div className="relative px-[3.3vw] sm:px-4 md:px-3 lg:px-4 xl:px-6">
        <Carousel
          className="w-full"
          setApi={setEmbla}
          opts={{ align: 'center', loop: true, containScroll: 'keepSnaps' }}
        >
          <CarouselContent className="gap-2 sm:gap-4">
            {products.map((product, index) => {
              const isSelected = index === selectedIndex;
              const isNeighbor = index === prevIndex || index === nextIndex;
              return (
                <CarouselItem
                  key={product.id}
                  className="basis-[80%] sm:basis-[60%] md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Link
                    to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`}
                    className="block"
                  >
                    <div
                      className={[
                        'transition-transform transition-opacity duration-300 ease-out',
                        isSelected ? 'opacity-100 scale-100' : isNeighbor ? 'opacity-60 scale-95' : 'opacity-40 scale-95',
                      ].join(' ')}
                    >
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
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Mobile/Tablet overlay arrows */}
          <div className="pointer-events-none absolute inset-y-0 left-2 right-2 flex items-center justify-between sm:left-3 sm:right-3 md:hidden">
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="pointer-events-auto w-10 h-10 rounded-full bg-background/90 border border-border/50 flex items-center justify-center shadow-sm"
              aria-label="Předchozí produkty"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="pointer-events-auto w-10 h-10 rounded-full bg-background/90 border border-border/50 flex items-center justify-center shadow-sm"
              aria-label="Další produkty"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </Carousel>
      </div>
    </div>
  );
};

export default ProductCarousel;