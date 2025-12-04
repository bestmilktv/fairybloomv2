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
    // NOVÝ PŘÍSTUP: gap-0 (mezery děláme paddingem buněk)
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 w-full justify-items-center pb-12">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          // WRAPPER S EFEKTY:
          // p-2: Vytváří 16px mezeru mezi kartami (8+8). To je ten prostor pro stín.
          // rounded-2xl: Zaoblení pro hover efekt.
          // hover:shadow-lg: Stín se aplikuje na tento wrapper.
          // hover:-translate-y-2: Posun nahoru.
          // hover:z-50: Kritické! Zvedne kartu nad sousedy, takže stín překryje vedlejší buňky.
          className="fade-in-up w-full max-w-[280px] p-2 transition-all duration-300 ease-out transform relative z-0 hover:z-50 hover:-translate-y-2 rounded-3xl hover:shadow-lg"
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