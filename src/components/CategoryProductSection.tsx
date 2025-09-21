import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
}

interface CategoryProductSectionProps {
  category: string;
  initialProducts: Product[];
}

const CategoryProductSection = ({ category, initialProducts }: CategoryProductSectionProps) => {
  const [products] = useState(initialProducts);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {products.map((product, index) => (
        <div key={product.id} className="fade-in-up-delayed" style={{ animationDelay: `${index * 0.1}s` }}>
          <ProductCard
            id={product.id}
            title={product.title}
            price={product.price}
            image={product.image}
            description={product.description}
          />
        </div>
      ))}
    </div>
  );
};

export default CategoryProductSection;