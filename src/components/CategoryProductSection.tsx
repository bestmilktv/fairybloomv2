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
    // GRID: 
    // gap-4 (16px) horizontálně - menší mezery.
    // gap-y-8 (32px) vertikálně.
    // p-4: Ochranná zóna okolo celého gridu (aby se stíny na krajích neořízly o okno).
    // pb-20: Místo dole.
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-8 w-full justify-items-center p-4 pb-20 overflow-visible">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          // WRAPPER:
          // max-w-[240px]: Zmenšené produkty (bylo 260px).
          // relative z-0 hover:z-50: TOTO JE TEN FIX. Při hoveru karta "přeletí" ostatní -> stín se neořízne.
          className="fade-in-up w-full max-w-[240px] relative z-0 hover:z-50 transition-all duration-300 ease-out"
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
              // Prvních 6 produktů načteme prioritně pro rychlost (LCP), zbytek lazy
              priority={index < 6}
            />
          </Link>
        </div>
      ))}
    </div>
  );
};

export default CategoryProductSection;