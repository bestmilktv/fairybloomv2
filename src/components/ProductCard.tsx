import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
  inventoryQuantity?: number | null;
}

const ProductCard = ({ id, title, price, image, description, inventoryQuantity }: ProductCardProps) => {
  const location = useLocation();
  const isHomepage = location.pathname === '/';
  
  // Determine availability status
  const getAvailabilityStatus = () => {
    if (inventoryQuantity === null || inventoryQuantity === undefined) {
      return null; // Don't show anything if inventory is unknown
    }
    return inventoryQuantity > 0 ? 'Skladem' : 'Není skladem';
  };

  const availabilityStatus = getAvailabilityStatus();

  // Function to truncate description to 3 lines
  const truncateDescription = (text: string) => {
    if (!text) return '';
    
    // Split text into words
    const words = text.split(' ');
    const maxWords = 20; // Approximate words for 3 lines
    
    if (words.length <= maxWords) {
      return text;
    }
    
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 h-full flex flex-col">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
        />
      </div>
      
      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-serif text-xl font-semibold text-luxury mb-2 hover:text-gold transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>
        
        {description && (
          <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3 flex-grow">
            {truncateDescription(description)}
          </p>
        )}
        
        <div className="space-y-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold text-gold font-serif">
              {price}
            </span>
            <Button variant="premium" size="sm">
              Detail
            </Button>
          </div>
          
          {/* Availability status - only show on collection pages, not homepage */}
          {!isHomepage && availabilityStatus && (
            <p className={`text-sm ${
              availabilityStatus === 'Skladem' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {availabilityStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;