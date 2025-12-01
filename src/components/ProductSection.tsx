import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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

const ProductSection = ({ id, title, subtitle, products, categoryPath }: ProductSectionProps) => {
  const [sectionRef, sectionVisible] = useScrollAnimation();
  
  return (
    <section 
      id={id} 
      ref={sectionRef}
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
        
        {/* Products Carousel */}
        <div>
          <ProductCarousel products={products} />
        </div>
        
        {/* View More Button */}
        <div className="text-center fade-in-up mt-6 pb-2">
          <Link 
            to={categoryPath}
            className="inline-flex items-center px-6 py-3 bg-primary/80 hover:bg-primary/90 rounded-lg transition-all duration-300 transform hover:scale-105 text-base font-medium text-primary-foreground shadow-lg hover:shadow-lg"
          >
            Zobrazit více
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;