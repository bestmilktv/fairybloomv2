import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface ProductCardLightProps {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
  disableAnimations?: boolean;
}

/**
 * OPTIMALIZACE: Ultra-lehká verze ProductCard pro karusely
 * - BEZ useCart, useLocation, useToast = 0 context subscriptions
 * - BEZ hover animací = minimální GPU zátěž
 * - BEZ transitions na kartě = plynulé scrollování
 * - Tlačítko "Zobrazit detail" místo "Přidat do košíku"
 */
const ProductCardLight = memo(({ title, price, image, description }: ProductCardLightProps) => {
  
  const truncateDescription = (text: string) => {
    if (!text) return '';
    const words = text.split(' ');
    const maxWords = 20;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Obrázek - bez hover efektů pro lepší výkon */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          width={300}
          height={300}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        />
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-serif text-xl font-semibold text-primary mb-2 line-clamp-2 min-h-[3.5rem]">
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
          </div>
          
          <Button 
            variant="gold" 
            size="sm"
            className="w-full bg-gold text-primary"
          >
            Zobrazit detail
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCardLight.displayName = 'ProductCardLight';

export default ProductCardLight;
