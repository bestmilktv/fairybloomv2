import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';

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
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  return (
    // GRID: gap-x-4 (16px) = malé mezery. gap-y-8 = vertikální odstup.
    // pb-12 = místo dole pro stín poslední řady.
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 w-full justify-items-center overflow-visible pb-12">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          // WRAPPER:
          // p-2: Minimální padding, aby mřížka byla kompaktní.
          // hover:z-50: TOTO OPRAVUJE STÍN. Při najetí se karta vykreslí NAD sousedy.
          className="fade-in-up w-full max-w-[280px] p-2 relative z-0 hover:z-50 transition-all duration-300 ease-out"
          style={{ 
            animationDelay: `${0.4 + index * 0.1}s`
          }}
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
            />
          </Link>
        </div>
      ))}
    </div>
  );
};

export default CategoryProductSection;