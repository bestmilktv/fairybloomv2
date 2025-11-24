import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, Loader2, Check } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProductRecommendations } from '@/components/ProductRecommendations';
import { getProductByHandle, createCart } from '@/lib/shopify';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import BackToCollectionButton from '@/components/BackToCollectionButton';
import { createCollectionHandle } from '@/lib/slugify';
import { BackInStockNotification } from '@/components/BackInStockNotification';

// Import fallback images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

interface ProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
}

interface ProductImage {
  url: string;
  altText?: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  tags: string[];
  images: {
    edges: Array<{
      node: ProductImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ProductVariant;
    }>;
  };
  collections?: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
      };
    }>;
  };
}

const DynamicProductPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart: addToLocalCart, items } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites, isLoading: favoritesLoading } = useFavorites();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [animatingToCart, setAnimatingToCart] = useState(false);
  const productImageRef = useRef<HTMLImageElement>(null);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [handle]);

  // Fetch product data from Shopify
  useEffect(() => {
    const fetchProduct = async () => {
      if (!handle) return;

      try {
        setIsLoading(true);
        setHasError(false);

        const productData = await getProductByHandle(handle);

        if (!productData) {
          setHasError(true);
          return;
        }

        setProduct(productData);
        
        // Set first variant as selected by default
        if (productData.variants.edges.length > 0) {
          setSelectedVariant(productData.variants.edges[0].node);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [handle]);

  // Get fallback image based on product title/category
  const getFallbackImage = (productTitle: string) => {
    const title = productTitle.toLowerCase();
    if (title.includes('náhrdelník') || title.includes('necklace')) return necklaceImage;
    if (title.includes('náušnice') || title.includes('earring')) return earringsImage;
    if (title.includes('prsten') || title.includes('ring')) return ringImage;
    if (title.includes('náramek') || title.includes('bracelet')) return braceletImage;
    return necklaceImage; // default fallback
  };

  // Format price for display
  const formatPrice = (price: { amount: string; currencyCode: string }) => {
    const amount = parseFloat(price.amount);
    const formattedAmount = amount.toLocaleString('cs-CZ');
    return `${formattedAmount} ${price.currencyCode}`;
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!product || !selectedVariant || isAddingToCart || animatingToCart) return;

    // Check if product is already in cart
    const isInCart = items.some(item => item.id === product.id);
    if (isInCart) return;

    try {
      setIsAddingToCart(true);
      setAnimatingToCart(true);

      // Create flying image animation
      if (productImageRef.current) {
        const productImg = productImageRef.current;
        const cartIcon = document.querySelector('[data-cart-icon]');
        
        if (cartIcon) {
          // Create clone of product image
          const flyingImg = productImg.cloneNode(true) as HTMLImageElement;
          flyingImg.style.position = 'fixed';
          flyingImg.style.width = '80px';
          flyingImg.style.height = '80px';
          flyingImg.style.borderRadius = '50%';
          flyingImg.style.zIndex = '9999';
          flyingImg.style.transition = 'all 0.8s ease-in-out';
          flyingImg.style.pointerEvents = 'none';
          
          // Get positions
          const productRect = productImg.getBoundingClientRect();
          const cartRect = cartIcon.getBoundingClientRect();
          
          // Set initial position
          flyingImg.style.left = `${productRect.left + productRect.width / 2 - 40}px`;
          flyingImg.style.top = `${productRect.top + productRect.height / 2 - 40}px`;
          
          document.body.appendChild(flyingImg);
          
          // Animate to cart
          setTimeout(() => {
            flyingImg.style.left = `${cartRect.left + cartRect.width / 2 - 40}px`;
            flyingImg.style.top = `${cartRect.top + cartRect.height / 2 - 40}px`;
            flyingImg.style.transform = 'scale(0.3)';
            flyingImg.style.opacity = '0.7';
          }, 50);
          
          // Remove element after animation
          setTimeout(() => {
            if (flyingImg && flyingImg.parentNode) {
              flyingImg.parentNode.removeChild(flyingImg);
            }
            // Animation complete, button will now show cart state
            setAnimatingToCart(false);
          }, 850);
        } else {
          setAnimatingToCart(false);
        }
      }

      // Add to cart with Shopify variant information
      const price = parseFloat(selectedVariant.price.amount);
      const image = displayImages[0]?.url || fallbackImage;
      
      await addToLocalCart({
        id: product.id, // Use product ID as main ID
        name: product.title,
        price: price,
        image: image,
        category: 'Shopify Product',
        variantId: selectedVariant.id, // Store variant ID for checkout
        isShopifyProduct: true // Flag as Shopify product
      });
      
      // Show success message
      toast({
        title: "Přidáno do košíku",
        description: `${product.title} byl přidán do vašeho košíku.`,
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat produkt do košíku. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product || favoritesLoading) return;

    const productId = product.id;
    const isCurrentlyFavorite = isFavorite(productId);

    try {
      if (isCurrentlyFavorite) {
        await removeFromFavorites(productId);
        toast({
          title: "Odebráno z oblíbených",
          description: `${product.title} byl odebrán z vašich oblíbených.`,
        });
      } else {
        await addToFavorites(productId);
        toast({
          title: "Přidáno do oblíbených",
          description: `${product.title} byl přidán do vašich oblíbených.`,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat oblíbené. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Loading skeleton for images */}
              <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-2xl animate-pulse"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
              
              {/* Loading skeleton for details */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="h-12 bg-muted rounded-lg animate-pulse"></div>
                  <div className="h-8 bg-muted rounded-lg w-32 animate-pulse"></div>
                </div>
                <div className="h-6 bg-muted rounded-lg animate-pulse"></div>
                <div className="h-12 bg-muted rounded-lg animate-pulse"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded-lg animate-pulse"></div>
                  <div className="h-6 bg-muted rounded-lg animate-pulse"></div>
                  <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (hasError || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 text-center">
          <h1 className="text-4xl font-serif text-luxury mb-4">Produkt nenalezen</h1>
          <p className="text-muted-foreground mb-8">
            Omlouváme se, ale požadovaný produkt nebyl nalezen.
          </p>
          <Link to="/" className="text-gold hover:underline">
            Zpět na hlavní stránku
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Get product images
  const images = product.images.edges.map(edge => edge.node);
  const fallbackImage = getFallbackImage(product.title);
  const displayImages = images.length > 0 ? images : [{ url: fallbackImage, altText: product.title }];

  // Get product variants
  const variants = product.variants.edges.map(edge => edge.node);

  // Get primary collection for back button
  const primaryCollection = product.collections?.edges?.[0]?.node;
  
  // Collection mapping for URL paths - using slugified handles (these are the actual Shopify handles!)
  const collectionMapping = {
    'nahrdelniky': 'nahrdelniky',  // Actual Shopify handle (slugified)
    'nausnice': 'nausnice',        // Actual Shopify handle (slugified)
    'prsteny': 'prsteny',          // Actual Shopify handle (no diacritics)
    'naramky': 'naramky'           // Actual Shopify handle (slugified)
  };


  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back to Collection Button */}
          <div className="mb-6 fade-in-up">
            <BackToCollectionButton
              productTags={product?.tags}
              productCollections={product?.collections?.edges?.map(edge => edge.node)}
              productHandle={product?.handle}
              fallbackCollectionHandle={primaryCollection ? collectionMapping[primaryCollection.handle as keyof typeof collectionMapping] || primaryCollection.handle : undefined}
              fallbackCollectionTitle={primaryCollection?.title}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Product Images */}
            <div className="space-y-4 fade-in-up relative">
              {/* Sticky Breadcrumb */}
              <div className="sticky top-24 z-10 bg-background/95 backdrop-blur-sm pb-4 mb-4">
                <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Link to="/" className="hover:text-foreground transition-colors">
                    Domů
                  </Link>
                  <span>/</span>
                  <Link 
                    to={primaryCollection ? `/${collectionMapping[primaryCollection.handle as keyof typeof collectionMapping] || primaryCollection.handle}` : '/nahrdelniky'} 
                    className="hover:text-foreground transition-colors"
                  >
                    {primaryCollection?.title || 'Produkty'}
                  </Link>
                  <span>/</span>
                  <span className="text-foreground">{product.title}</span>
                </nav>
              </div>
              {/* Main Image */}
              <div className="aspect-square bg-muted rounded-2xl overflow-hidden">
                <img
                  ref={productImageRef}
                  src={displayImages[selectedImage]?.url || fallbackImage}
                  alt={displayImages[selectedImage]?.altText || product.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              
              {/* Thumbnail Images */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {displayImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        selectedImage === index 
                          ? 'border-gold shadow-lg' 
                          : 'border-transparent hover:border-gold/50'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.altText || `${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-8 fade-in-up-delayed" style={{ animationDelay: '0.2s' }}>
              {/* Title and Price */}
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-4 tracking-wide">
                  {product.title}
                </h1>
                {selectedVariant && (
                  <p className="text-3xl font-serif font-semibold text-gold">
                    {formatPrice(selectedVariant.price)}
                  </p>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div 
                  className="text-xl text-muted-foreground leading-relaxed prose prose-lg max-w-none text-justify"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {/* Variant Selection */}
              {variants.length > 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-luxury">Varianty</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        disabled={!variant.availableForSale}
                        className={`p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                          selectedVariant?.id === variant.id
                            ? 'border-gold bg-gold/10'
                            : variant.availableForSale
                            ? 'border-border hover:border-gold/50'
                            : 'border-border opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-medium text-foreground">{variant.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatPrice(variant.price)}
                        </div>
                        {!variant.availableForSale && (
                          <div className="text-xs text-red-500 mt-1">Není skladem</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <div className="space-y-3">
                <div className="flex space-x-4">
                  <Button 
                    variant="gold" 
                    size="lg" 
                    className={`flex-1 ${
                      items.some(item => item.id === product.id)
                        ? 'bg-slate-800/95 hover:bg-slate-800 border border-gold/40 text-gold shadow-lg shadow-gold/10 hover:shadow-gold/20 hover:border-gold/60 transition-all duration-300'
                        : ''
                    }`}
                    onClick={handleAddToCart}
                    disabled={!selectedVariant || !selectedVariant.availableForSale || isAddingToCart || animatingToCart || items.some(item => item.id === product.id)}
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Přidávám...
                      </>
                    ) : animatingToCart ? (
                      'Přidávám...'
                    ) : items.some(item => item.id === product.id) ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Přidáno do košíku
                      </>
                    ) : !selectedVariant?.availableForSale ? (
                      'Není skladem'
                    ) : (
                      'Přidat do košíku'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className={`aspect-square p-0 transition-all duration-300 shadow-lg hover:shadow-xl ${
                      isFavorite(product.id)
                        ? 'border-red-500 hover:border-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                        : 'hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/10'
                    }`}
                    onClick={handleToggleFavorite}
                    disabled={favoritesLoading}
                  >
                    <Heart 
                      className={`h-5 w-5 transition-all duration-300 ${
                        isFavorite(product.id)
                          ? 'fill-red-500 text-red-500 scale-110'
                          : ''
                      }`}
                    />
                  </Button>
                </div>
                
                {/* Back in Stock Notification */}
                {selectedVariant && !selectedVariant.availableForSale && (
                  <BackInStockNotification
                    variantId={selectedVariant.id}
                    productTitle={product.title}
                    isOutOfStock={!selectedVariant.availableForSale}
                  />
                )}
              </div>

              {/* Product Features */}
              <div className="border-t border-border pt-8">
                <h3 className="text-xl font-serif font-semibold text-luxury mb-4">
                  Vlastnosti
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Ručně vyráběno s láskou k detailu</li>
                  <li>• Skutečné květy konzervované v pryskyřici</li>
                  <li>• Hypoalergenní materiály</li>
                  <li>• Každý kus je jedinečný</li>
                  <li>• Dodáváno v elegantním balení</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Recommendations */}
      <ProductRecommendations 
        currentProductId={product.id}
        currentCategory="Shopify Product"
      />

      <Footer />
    </div>
  );
};

export default DynamicProductPage;
