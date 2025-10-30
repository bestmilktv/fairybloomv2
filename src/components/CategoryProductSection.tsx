import { useState, useEffect, useRef } from 'react';
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
}

interface CategoryProductSectionProps {
  category: string;
  initialProducts: Product[];
}

const CategoryProductSection = ({ category, initialProducts }: CategoryProductSectionProps) => {
  const [products, setProducts] = useState(initialProducts);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Initialize animations for products when they mount
  useEffect(() => {
    if (!containerRef.current) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const elements = containerRef.current.querySelectorAll('.apple-fade-in, .fade-in-up-delayed');
    elements.forEach((el) => {
      observer.observe(el);
      // If element is already in viewport, make it visible immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
      }
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [products]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          className="apple-fade-in" 
          style={{ transitionDelay: `${index * 0.05}s` }}
        >
          <Link 
            to={product.handle ? `/produkt/${product.handle}` : `/product-shopify/${product.handle}`} 
            className="group cursor-pointer block"
          >
            <ProductCard
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.image}
              description={product.description}
              inventoryQuantity={product.inventoryQuantity}
            />
          </Link>
        </div>
      ))}
    </div>
  );
};

export default CategoryProductSection;