import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
}

const ProductCard = ({ id, title, price, image, description }: ProductCardProps) => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
        />
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="font-serif text-xl font-semibold text-luxury mb-2 hover:text-gold transition-colors duration-300">
          {title}
        </h3>
        
        {description && (
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold text-gold font-serif">
            {price}
          </span>
          <Button variant="premium" size="sm">
            Detail
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;