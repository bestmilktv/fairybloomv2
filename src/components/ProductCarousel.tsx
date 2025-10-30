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

  // Center index approximation within current viewport
  const centerIndex = useMemo(() => selectedIndex + Math.floor((visibleCount - 1) / 2), [selectedIndex, visibleCount]);

  return (
    <div className="relative w-full">
      <div className="relative px-4 sm:px-6">
        <Carousel
          className="w-full"
          setApi={setEmbla}
          opts={{ align: 'center', loop: true, containScroll: 'trimSnaps' }}
        >
          <CarouselContent className="gap-2 sm:gap-4">
            {products.map((product, index) => {
              const isEdgeLeft = index === selectedIndex;
              const isEdgeRight = index === selectedIndex + (visibleCount - 1);
              const isCenter = index === centerIndex;
              const dimSide = !isCenter && (isEdgeLeft || isEdgeRight);
              return (
                <CarouselItem
                  key={product.id}
                  className="basis-[72%] sm:basis-[60%] md:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
                >
                  <Link
                    to={product.handle ? createProductPath(product.handle) : `/product-shopify/${product.handle}`}
                    className="block"
                  >
                    <div
                      className={[
                        'transition-transform transition-opacity duration-300',
                        dimSide ? 'opacity-60 scale-95' : 'opacity-100 scale-100',
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