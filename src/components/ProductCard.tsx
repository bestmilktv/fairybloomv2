import { memo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useIsInCart } from '@/hooks/useIsInCart';
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
  priority?: boolean;
  tags?: string[];
}

// OPTIMALIZACE: Memoizovaná komponenta - re-renderuje se jen při změně props
const ProductCard = memo(({ id, title, price, image, description, inventoryQuantity, disableAnimations = false, variantId, priority = false, tags }: ProductCardProps) => {
  const location = useLocation();
  const isHomepage = location.pathname === '/';
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  // OPTIMALIZACE: Použití useIsInCart hooku pro minimalizaci re-renderů
  const isInCart = useIsInCart(id);
  
  const getAvailabilityStatus = () => {
    if (inventoryQuantity === null || inventoryQuantity === undefined) {
      return null;
    }
    return inventoryQuantity > 0 ? 'Skladem' : 'Není skladem';
  };

  const availabilityStatus = getAvailabilityStatus();
  
  // OPTIMALIZACE: Memoizovaný callback
  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
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
  }, [isInCart, variantId, price, addToCart, id, title, image, toast]);

  const truncateDescription = (text: string) => {
    if (!text) return '';
    const words = text.split(' ');
    const maxWords = 20;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Třídy jsou nyní jednotné. Hover efekty jsou aktivní VŽDY.
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
    transition-[box-shadow,transform,background-color] 
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
    transform-gpu
    backface-hidden
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

  // bg-muted slouží jako placeholder při lazy loading obrázků
  // overflow-hidden: Obrázek se při hoveru zvětší (scale), ale zůstane uvnitř zaoblených rohů (maska)
  const imageWrapperClasses = "aspect-square overflow-hidden bg-muted rounded-t-2xl relative";

  const hasTipTag = tags?.some(tag => tag.toLowerCase() === 'tip');

  return (
    <div className={cardClasses}>
      <div className={imageWrapperClasses}>
        {hasTipTag && (
          <div className="absolute top-2 left-2 z-10 bg-gold text-primary px-3 py-1 text-sm font-semibold rounded shadow-md border border-primary/10">
            Náš tip
          </div>
        )}
        {/* OPTIMALIZACE: width a height atributy pro prevenci CLS (Cumulative Layout Shift) */}
        <img
          src={image}
          alt={title}
          width={300}
          height={300}
          className={imageClasses}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
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
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
