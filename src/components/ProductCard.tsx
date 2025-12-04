import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';

interface ProductCardProps {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
  inventoryQuantity?: number | null;
  disableAnimations?: boolean;
  variantId?: string;
}

const ProductCard = ({ id, title, price, image, description, inventoryQuantity, disableAnimations = false, variantId }: ProductCardProps) => {
  const location = useLocation();
  const isHomepage = location.pathname === '/';
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  
  const isInCart = items.some(item => item.id === id);
  
  const getAvailabilityStatus = () => {
    if (inventoryQuantity === null || inventoryQuantity === undefined) {
      return null;
    }
    return inventoryQuantity > 0 ? 'Skladem' : 'Není skladem';
  };

  const availabilityStatus = getAvailabilityStatus();
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInCart || !variantId) return;
    
    try {
      const priceNumber = parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      await addToCart({
        id: id,
        name: title,
        price: priceNumber,
        image: image,
        category: 'Shopify Product',
        variantId: variantId,
        isShopifyProduct: true,
      });
      
      toast({
        title: "Přidáno do košíku",
        description: `${title} byl přidán do vašeho košíku.`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Chyba při přidávání do košíku",
        description: "Nepodařilo se přidat produkt do košíku. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  };

  const truncateDescription = (text: string) => {
    if (!text) return '';
    const words = text.split(' ');
    const maxWords = 20;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // ZMĚNA: hover:shadow-lg (místo xl) - kratší stín
  const cardClasses = disableAnimations
    ? "bg-card rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] h-full flex flex-col transition-none"
    : "bg-card rounded-2xl overflow-visible shadow-sm hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2 h-full flex flex-col";
  
  const imageClasses = disableAnimations
    ? "w-full h-full object-cover"
    : "w-full h-full object-cover transition-transform duration-700 hover:scale-110";
  
  const titleClasses = disableAnimations
    ? "font-serif text-xl font-semibold text-primary mb-2 line-clamp-2 min-h-[3.5rem]"
    : "font-serif text-xl font-semibold text-primary mb-2 hover:text-accent transition-colors duration-300 line-clamp-2 min-h-[3.5rem]";

  const imageWrapperClasses = disableAnimations
    ? "aspect-square overflow-hidden rounded-t-2xl"
    : "aspect-square overflow-hidden bg-muted rounded-t-2xl";

  return (
    <div className={cardClasses}>
      <div className={imageWrapperClasses}>
        <img
          src={image}
          alt={title}
          className={imageClasses}
          loading="eager"
          decoding="sync"
          style={disableAnimations ? {
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          } : undefined}
        />
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className={titleClasses}>
          {title}
        </h3>
        
        {description && (
          <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3 flex-grow text-justify">
            {truncateDescription(description)}
          </p>
        )}
        
        <div className="space-y-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold text-price-gold font-serif">
              {price}
            </span>
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
          
          <Button 
            variant="gold" 
            size="sm"
            onClick={handleAddToCart}
            disabled={isInCart || !variantId}
            className={`w-full ${
              isInCart 
                ? 'bg-primary/80 hover:bg-primary/90 border border-primary/30 text-primary-foreground shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300' 
                : ''
            }`}
          >
            {isInCart ? (
              <>
                <Check className="h-4 w-4" />
                Přidáno do košíku
              </>
            ) : (
              'Přidat do košíku'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;