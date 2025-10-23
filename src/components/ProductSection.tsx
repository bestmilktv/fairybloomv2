import { useState, useEffect } from 'react';
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
}

interface ProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  categoryPath: string;
}

const ProductSection = ({ id, title, subtitle, products, categoryPath }: ProductSectionProps) => {
  const [sectionRef, sectionVisible] = useScrollAnimation();
  
  return (
    <section 
      id={id} 
      ref={sectionRef}
      className={`py-5 px-6 scroll-fade-in ${sectionVisible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 fade-in-up">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-4 tracking-wide">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>
        
        {/* Products Carousel */}
        <div className="mb-12">
          <ProductCarousel products={products} />
        </div>
        
        {/* View More Button */}
        <div className="text-center fade-in-up">
          <Link to={categoryPath}>
            <Button variant="premium" size="lg">
              Zobrazit více
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;