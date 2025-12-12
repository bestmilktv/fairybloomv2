import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCarousel from './ProductCarousel';
import { fadeInUp } from '@/utils/animations';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  inventoryQuantity?: number | null;
  variantId?: string;
  tags?: string[];
}

interface ProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  categoryPath: string;
}

// OPTIMALIZACE: Memoizovaná komponenta - re-renderuje se jen při změně props
const ProductSection = memo(({ id, title, subtitle, products, categoryPath }: ProductSectionProps) => {
  return (
    <section 
      id={id} 
      className="pt-[60px] pb-5 px-6 overflow-hidden" 
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header - Animuje se samostatně, až když je vidět */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20%" }}
          variants={fadeInUp}
          className="text-center mb-6"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 tracking-wide">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </motion.div>
        
        {/* Products Carousel - Animuje se samostatně */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }} // Menší margin, aby se začal načítat dřív
          variants={fadeInUp}
        >
          <ProductCarousel products={products} />
        </motion.div>
        
        {/* View More Button - Animuje se samostatně, až když k němu uživatel doscrolluje */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
          variants={fadeInUp}
          className="text-center mt-6 pt-2 pb-8 overflow-visible"
        >
          <Link 
            to={categoryPath}
            className="inline-flex items-center px-6 py-3 bg-primary/80 hover:bg-primary/90 rounded-lg transition-[background-color,transform,box-shadow] duration-300 ease-in-out transform hover:scale-105 text-base font-medium text-primary-foreground shadow-lg hover:shadow-lg"
          >
            Zobrazit více
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
});

ProductSection.displayName = 'ProductSection';

export default ProductSection;
