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

  // OPRAVA: Třídy jsou nyní jednotné. Hover efekty jsou aktivní VŽDY.
  // - group: Nutné pro hover efekt na obrázku.
  // - hover:shadow-lg: Kratší stín (jak jsi chtěl).
  // - hover:-translate-y-2: Jemný posun nahoru.
  // - overflow-visible: Aby se stín neořízl.
  const cardClasses = `
    bg-card 
    rounded-2xl 
    overflow-visible 
    h-full 
    flex 
    flex-col 
    relative 
    group 
    shadow-sm 
    hover:shadow-lg 
    hover:-translate-y-2 
    transition-all 
    duration-500 
    ease-out
  `;
  
  const imageClasses = `
    w-full 
    h-full 
    object-cover 
    transition-transform 
    duration-700 
    ease-in-out 
    group-hover:scale-110
  `;
  
  const titleClasses = `
    font-serif 
    text-xl 
    font-semibold 
    text-primary 
    mb-2 
    line-clamp-2 
    min-h-[3.5rem] 
    transition-colors 
    duration-300 
    group-hover:text-accent
  `;

  // Zde necháváme overflow-hidden jen pro obrázek (aby se zakulatily rohy),
  // ale hlavní karta má overflow-visible pro stín.
  // bg-muted slouží jako placeholder při lazy loading obrázků
  const imageWrapperClasses = "aspect-square overflow-hidden bg-muted rounded-t-2xl";

  return (
    <div className={cardClasses}>
      <div className={imageWrapperClasses}>
        <img
          src={image}
          alt={title}
          className={imageClasses}
          loading="lazy"
          decoding="async"
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
                : 'bg-gold text-primary transition-transform duration-300 hover:scale-[1.02] active:scale-95'
            }`}
            style={!isInCart ? { opacity: 1, isolation: 'isolate' } : undefined}
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