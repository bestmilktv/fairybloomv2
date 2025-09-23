import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCard from './ProductCard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
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
      className={`py-20 px-6 scroll-fade-in ${sectionVisible ? 'visible' : ''}`}
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
        
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {products.map((product, index) => (
            <div key={product.id} className={`fade-in-up-delayed`} style={{ animationDelay: `${index * 0.1}s` }}>
              <Link 
                to={product.handle ? `/produkt/${product.handle}` : `/product-shopify/${product.handle}`} 
                className="group cursor-pointer fade-in-up block"
              >
                <ProductCard
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  description={product.description}
                />
              </Link>
            </div>
          ))}
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