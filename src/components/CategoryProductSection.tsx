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
    /* ZMĚNA: gap-6 (větší mezery mezi buňkami)
      p-2 (trochu větší padding celého kontejneru)
    */
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full overflow-visible p-2">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          /* KLÍČOVÁ ZMĚNA: p-6 (24px)
             - Vytváří velkou bezpečnou zónu, takže stín se NEOŘÍZNE.
             - Zároveň tím přirozeně ZMENŠÍ vizuální velikost karty uvnitř buňky.
             - Ponecháváme z-indexy pro jistotu.
          */
          className="fade-in-up w-full p-6 relative z-10 hover:z-20 transition-all duration-300 ease-out"
          style={{ 
            animationDelay: `${0.4 + index * 0.1}s`
          }}
        >
          <Link 
            to={product.handle ? `/produkt/${product.handle}` : `/product-shopify/${product.handle}`} 
            className="group cursor-pointer block h-full"
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