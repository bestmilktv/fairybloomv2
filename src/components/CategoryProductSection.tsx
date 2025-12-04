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
    // OPRAVA:
    // gap-4 gap-y-8: Tvoje požadované mezery.
    // p-4: Ochranný okraj kolem gridu, aby se stín neořízl o kraj okna.
    // relative z-10: Celý grid je v nižší vrstvě než navbar (který má z-999).
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-8 w-full justify-items-center p-4 overflow-visible relative z-10">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          // OPRAVA PROTÍNÁNÍ NAVBARU A VELIKOSTI:
          // max-w-[260px]: Jemné zmenšení produktu.
          // hover:z-20: Při hoveru se karta zvedne NAD ostatní karty, ale zůstane POD navbarem (z-999).
          // relative: Nutné pro funkčnost z-indexu.
          className="fade-in-up w-full max-w-[260px] relative z-0 hover:z-20 transition-all duration-300 ease-out"
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