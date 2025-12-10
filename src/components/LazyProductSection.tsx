import { memo } from 'react';
import ProductSection from './ProductSection';

interface LazyProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  products: any[];
  categoryPath: string;
}

/**
 * OPTIMALIZACE: Zjednodušený wrapper
 * Framer Motion v ProductSection se postará o detekci viewportu
 * Ponecháváme memoizaci pro výkon
 */
const LazyProductSection = memo(({ id, title, subtitle, products, categoryPath }: LazyProductSectionProps) => {
  return (
    <ProductSection
      id={id}
      title={title}
      subtitle={subtitle}
      products={products}
      categoryPath={categoryPath}
    />
  );
});

LazyProductSection.displayName = 'LazyProductSection';

export default LazyProductSection;

