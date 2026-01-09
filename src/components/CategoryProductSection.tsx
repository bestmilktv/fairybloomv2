import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { fadeInUp, staggerContainer } from '@/utils/animations';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  handle: string;
  inventoryQuantity?: number | null;
  variantId?: string;
  tags?: string[];
}

interface CategoryProductSectionProps {
  category: string;
  initialProducts: Product[];
}

const CategoryProductSection = ({ category, initialProducts }: CategoryProductSectionProps) => {
  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={staggerContainer(0.1)}
      layout // Přidán layout prop pro hladké přeskládání gridu
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 gap-y-8 w-full px-4 pb-20 overflow-visible"
    >
      {initialProducts.map((product, index) => (
        <motion.div 
          key={product.id} 
          layout // Přidán layout prop i pro jednotlivé karty
          variants={fadeInUp}
          // OPTIMALIZACE: Odstraněn transition-all duration-300, který kolidoval s Framer Motion
          // Ponechán jen hover efekt na z-index a padding
          // hover:z-40 odstraněno pro zamezení layout thrashingu
          // Změna: odstraněn max-w a justify-items-center, karty vyplní sloupec
          className="w-full relative z-0 overflow-visible"
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
              description={undefined}
              inventoryQuantity={product.inventoryQuantity}
              variantId={product.variantId}
              priority={index < 6}
              tags={product.tags}
            />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default CategoryProductSection;