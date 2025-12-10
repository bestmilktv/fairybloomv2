import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { fadeInUp } from '@/utils/animations';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  handle: string;
  inventoryQuantity?: number | null;
  variantId?: string;
}

interface CategoryProductSectionProps {
  category: string;
  initialProducts: Product[];
}

const CategoryProductSection = ({ category, initialProducts }: CategoryProductSectionProps) => {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 gap-y-6 w-full justify-items-center p-4 pb-20 overflow-visible"
    >
      {initialProducts.map((product, index) => (
        <motion.div 
          key={product.id} 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          variants={fadeInUp}
          // OPTIMALIZACE: Odstraněn transition-all duration-300, který kolidoval s Framer Motion
          // Ponechán jen hover efekt na z-index a padding
          className="w-full max-w-[280px] relative z-0 hover:z-40 p-3 overflow-visible"
        >
          <Link 
            to={product.handle ? `/produkt/${product.handle}` : `/product-shopify/${product.handle}`} 
            className="group cursor-pointer block h-full overflow-visible"
          >
            <ProductCard
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.image}
              description={product.description}
              inventoryQuantity={product.inventoryQuantity}
              variantId={product.variantId}
              priority={index < 6}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default CategoryProductSection;