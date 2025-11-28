import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCarousel from './ProductCarousel';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  inventoryQuantity?: number | null;
  variantId?: string;
}

interface ProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  categoryPath: string;
}

const ProductSection = React.memo(({ id, title, subtitle, products, categoryPath }: ProductSectionProps) => {
  const [sectionRef, sectionVisible] = useScrollAnimation();
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!sectionElementRef.current) return;

    // Use Intersection Observer to lazy load section content
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Disconnect after first load to prevent re-triggering
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before section enters viewport
      }
    );

    observerRef.current.observe(sectionElementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Combine refs
  const combinedRef = (node: HTMLElement | null) => {
    sectionElementRef.current = node;
    if (typeof sectionRef === 'function') {
      sectionRef(node);
    } else if (sectionRef) {
      (sectionRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };
  
  return (
    <section 
      id={id} 
      ref={combinedRef}
      className={`pt-[60px] pb-5 px-6 scroll-fade-in ${sectionVisible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-6 fade-in-up">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 tracking-wide">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>
        
        {/* Products Carousel - Lazy loaded */}
        {isInView ? (
          <div>
            <ProductCarousel products={products} />
          </div>
        ) : (
          <div className="h-96 bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center">
            <p className="text-muted-foreground">Načítám produkty...</p>
          </div>
        )}
        
        {/* View More Button */}
        {isInView && (
          <div className="text-center fade-in-up mt-6">
            <Link to={categoryPath}>
              <Button variant="premium" size="lg">
                Zobrazit více
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
});

ProductSection.displayName = 'ProductSection';

export default ProductSection;