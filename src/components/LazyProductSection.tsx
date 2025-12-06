import { useState, useEffect, useRef, memo } from 'react';
import ProductSection from './ProductSection';

interface LazyProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  products: any[];
  categoryPath: string;
}

/**
 * OPTIMALIZACE: Lazy loading wrapper pro ProductSection
 * Renderuje ProductSection (s karuselem a obrázky) až když je sekce
 * blízko viewportu. Dramaticky snižuje počáteční DOM elementy a obrázky.
 */
const LazyProductSection = memo(({ id, title, subtitle, products, categoryPath }: LazyProductSectionProps) => {
  // OPTIMALIZACE: Pouze jeden state místo dvou redundantních
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pokud už byla sekce zobrazena, nesleduj znovu
    if (hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          // Odpoj observer po prvním zobrazení
          observer.disconnect();
        }
      },
      {
        // OPTIMALIZACE: Sníženo z 300px na 100px pro menší zátěž na mobilech
        // Sekce se načte těsně před tím než bude viditelná
        rootMargin: '100px 0px',
        threshold: 0
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasBeenVisible]);

  return (
    <div ref={containerRef}>
      {hasBeenVisible ? (
        <ProductSection
          id={id}
          title={title}
          subtitle={subtitle}
          products={products}
          categoryPath={categoryPath}
        />
      ) : (
        // Placeholder se stejnou výškou jako ProductSection
        // Zachovává scroll pozice a brání layout shiftu
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-muted/30 rounded-lg mb-4 max-w-md mx-auto"></div>
              <div className="h-6 bg-muted/20 rounded-lg mb-12 max-w-2xl mx-auto"></div>
              <div className="h-80 bg-muted/10 rounded-2xl"></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
});

LazyProductSection.displayName = 'LazyProductSection';

export default LazyProductSection;

