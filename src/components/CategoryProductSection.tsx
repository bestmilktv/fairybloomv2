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
    // GRID DEFINICE:
    // gap-4 (16px) = malé mezery
    // justify-items-center = centruje sloupce na střed stránky
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full justify-items-center">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          // WRAPPER KARTY:
          // w-full max-w-[280px] = fixní šířka karty (stejná jako u tlačítka nahoře)
          // p-3 = bezpečný prostor pro stín (aby se neořízl), ale neposouvá layout
          className="fade-in-up w-full max-w-[280px] p-3 relative z-0 hover:z-10"
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