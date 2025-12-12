import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface ProductCardLightProps {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
  disableAnimations?: boolean;
  tags?: string[];
}

/**
 * Lehká verze ProductCard pro karusely
 * - BEZ useCart, useLocation, useToast = 0 context subscriptions
 * - S hover animacemi pro pěkný UX
 * - Tlačítko "Zobrazit detail" místo "Přidat do košíku"
 */
const ProductCardLight = memo(({ title, price, image, description, disableAnimations = false, tags }: ProductCardLightProps) => {
  
  const truncateDescription = (text: string) => {
    if (!text) return '';
    const words = text.split(' ');
    const maxWords = 20;
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

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
        <img
          src={image}
          alt={title}
          width={300}
          height={300}
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
          </div>
          
          <Button 
            variant="gold" 
            size="sm"
            className="w-full bg-gold text-primary transition-transform duration-300 hover:scale-[1.02] active:scale-95"
            style={{ opacity: 1, isolation: 'isolate' }}
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
