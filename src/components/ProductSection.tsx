import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCarousel from './ProductCarousel';

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
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all animatable elements in this section
    if (headerRef.current) observer.observe(headerRef.current);
    if (carouselRef.current) observer.observe(carouselRef.current);
    if (buttonRef.current) observer.observe(buttonRef.current);

    return () => {
      if (headerRef.current) observer.unobserve(headerRef.current);
      if (carouselRef.current) observer.unobserve(carouselRef.current);
      if (buttonRef.current) observer.unobserve(buttonRef.current);
    };
  }, []);
  
  return (
    <section 
      id={id} 
      ref={sectionRef}
      className="py-5 px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 apple-fade-in">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-4 tracking-wide">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>
        
        {/* Products Carousel */}
        <div ref={carouselRef} className="mb-12 apple-fade-in" style={{ transitionDelay: '0.1s' }}>
          <ProductCarousel products={products} />
        </div>
        
        {/* View More Button */}
        <div ref={buttonRef} className="text-center apple-fade-in" style={{ transitionDelay: '0.2s' }}>
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