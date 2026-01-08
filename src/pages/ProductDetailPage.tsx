import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, Check } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/hooks/use-toast';
import { ProductRecommendations } from '@/components/ProductRecommendations';
import { getProductByHandle } from '@/lib/shopify';
import BackToCollectionButton from '@/components/BackToCollectionButton';
import { createCollectionHandle } from '@/lib/slugify';
import { BackInStockNotification } from '@/components/BackInStockNotification';

// Import product images for fallback
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const ProductDetailPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites, isLoading: favoritesLoading } = useFavorites();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [inventory, setInventory] = useState<number | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [primaryCollection, setPrimaryCollection] = useState<{handle: string, title: string} | null>(null);
  const productImageRef = useRef<HTMLImageElement>(null);
  
  // Touch/swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const minSwipeDistance = 50; // Minimální vzdálenost pro swipe

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [handle]);

  // Fetch product from Shopify
  useEffect(() => {
    const fetchProduct = async () => {
      if (!handle) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        // Try to fetch from Shopify using the handle
        const shopifyProduct = await getProductByHandle(handle);
        
        if (shopifyProduct) {
          const firstImage = shopifyProduct.images?.edges?.[0]?.node;
          const firstVariant = shopifyProduct.variants?.edges?.[0]?.node;
          
          // Get primary collection
          const firstCollection = shopifyProduct.collections?.edges?.[0]?.node;
          if (firstCollection) {
            setPrimaryCollection({
              handle: firstCollection.handle,
              title: firstCollection.title
            });
          }
          
          // Transform Shopify product to match expected format
          const transformedProduct = {
            id: shopifyProduct.id,
            title: shopifyProduct.title,
            price: firstVariant?.price ? 
              `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}` : 
              'Cena na vyžádání',
            images: shopifyProduct.images?.edges?.map(edge => edge.node.url) || [getFallbackImage()],
            category: getCategoryFromHandle(handle),
            categoryPath: getCategoryPath(handle),
            shortDescription: shopifyProduct.description || 'Elegantní šperk z naší kolekce',
            fullDescription: shopifyProduct.description || 'Elegantní šperk z naší kolekce s ruční výrobou a přírodními materiály.',
            handle: shopifyProduct.handle,
            variants: shopifyProduct.variants?.edges?.map(edge => edge.node) || [],
            inventoryQuantity: null, // Will be updated when inventory is fetched
            tags: shopifyProduct.tags
          };
          
          setProduct(transformedProduct);

          // DEBUG: Test inventory endpoint
          if (firstVariant?.id) {
            try {
              const inventoryUrl = `/api/shopify/inventory?variantGid=${encodeURIComponent(firstVariant.id)}`;
              console.log('DEBUG: Fetching inventory from URL:', inventoryUrl);
              console.log('DEBUG: Using variant ID:', firstVariant.id);
              
              const inventoryResponse = await fetch(inventoryUrl);
              const inventoryData = await inventoryResponse.json();
              
              console.log('DEBUG: Inventory API response:', inventoryData);
              console.log('DEBUG: Response status:', inventoryResponse.status);
            } catch (debugError) {
              console.error('DEBUG: Inventory API error:', debugError);
            }
          }

          // Fetch inventory for the first variant
          if (firstVariant?.id) {
            fetchInventory(firstVariant.id);
          }
        } else {
          setHasError(true);
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

  // Helper function to get fallback image
  const getFallbackImage = () => {
    if (!handle) return necklaceImage;
    if (handle.includes('nahr') || handle.includes('necklace')) return necklaceImage;
    if (handle.includes('naus') || handle.includes('earring')) return earringsImage;
    if (handle.includes('prst') || handle.includes('ring')) return ringImage;
    if (handle.includes('nara') || handle.includes('bracelet')) return braceletImage;
    return necklaceImage;
  };

  // Helper function to get category from handle
  const getCategoryFromHandle = (productHandle: string) => {
    if (productHandle.includes('nahr') || productHandle.includes('necklace')) return 'Náhrdelníky';
    if (productHandle.includes('naus') || productHandle.includes('earring')) return 'Náušnice';
    if (productHandle.includes('prst') || productHandle.includes('ring')) return 'Prsteny';
    if (productHandle.includes('nara') || productHandle.includes('bracelet')) return 'Náramky';
    return 'Náhrdelníky';
  };

  // Helper function to get category path
  const getCategoryPath = (productHandle: string) => {
    if (productHandle.includes('nahr') || productHandle.includes('necklace')) return '/nahrdelniky';
    if (productHandle.includes('naus') || productHandle.includes('earring')) return '/nausnice';
    if (productHandle.includes('prst') || productHandle.includes('ring')) return '/prsteny';
    if (productHandle.includes('nara') || productHandle.includes('bracelet')) return '/naramky';
    return '/nahrdelniky';
  };

  // Fetch inventory for a variant
  const fetchInventory = async (variantGid: string) => {
    try {
      setInventoryLoading(true);
      setInventoryError(false);

      const response = await fetch(`/api/shopify/inventory?variantGid=${encodeURIComponent(variantGid)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInventory(data.inventory_quantity);
      
      // Update product state with inventory quantity
      setProduct(prevProduct => ({
        ...prevProduct,
        inventoryQuantity: data.inventory_quantity
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventoryError(true);
      // Don't set inventory to null, keep previous value if any
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if product is already in cart
    const isInCart = items.some(item => item.id === product.id);
    if (isInCart) return;
    
    try {
      // Get the first variant (you might want to add variant selection UI later)
      const firstVariant = product.variants?.[0];
      if (!firstVariant) {
        throw new Error('No variant available for this product');
      }

      // Add to cart with variant ID
      const priceNumber = parseFloat(firstVariant.price.amount);
      await addToCart({
        id: product.id,
        name: product.title,
        price: priceNumber,
        image: product.images[0],
        category: product.category,
        variantId: firstVariant.id,
        isShopifyProduct: true,
      });
      
      toast({
        title: "Přidáno do košíku",
        description: `${product.title} byl přidán do vašeho košíku.`,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded-lg w-64 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-2xl"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-square bg-muted rounded-lg"></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-8 bg-muted rounded-lg w-3/4"></div>
                  <div className="h-6 bg-muted rounded-lg w-1/2"></div>
                  <div className="h-4 bg-muted rounded-lg w-full"></div>
                  <div className="h-4 bg-muted rounded-lg w-5/6"></div>
                  <div className="h-4 bg-muted rounded-lg w-4/6"></div>
                  <div className="h-12 bg-muted rounded-lg w-48"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (hasError || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 px-6 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-serif font-bold text-luxury mb-6">
              Produkt nenalezen
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Omlouváme se, ale požadovaný produkt nebyl nalezen.
            </p>
            <div className="space-x-4">
              <Button asChild className="bg-primary/80 hover:bg-primary/90 text-primary-foreground hover:shadow-md hover:shadow-primary/10">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na hlavní stránku
          </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/nahrdelniky">
                  Prohlédnout produkty
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Collection mapping for URL paths - using slugified handles (these are the actual Shopify handles!)
  const collectionMapping = {
    'nahrdelniky': 'nahrdelniky',  // Actual Shopify handle (slugified)
    'nausnice': 'nausnice',        // Actual Shopify handle (slugified)
    'prsteny': 'prsteny',          // Actual Shopify handle (no diacritics)
    'naramky': 'naramky'           // Actual Shopify handle (slugified)
  };

  const hasTipTag = product?.tags?.some((tag: string) => tag.toLowerCase() === 'tip');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Back to Collection Button */}
      <div className="pt-24 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <BackToCollectionButton
              productTags={product?.tags}
              productCollections={product?.collections?.edges?.map(edge => edge.node)}
              productHandle={product?.handle}
              fallbackCollectionHandle={primaryCollection ? collectionMapping[primaryCollection.handle as keyof typeof collectionMapping] || primaryCollection.handle : undefined}
              fallbackCollectionTitle={primaryCollection?.title}
            />
          </div>
        </div>
      </div>
      
      {/* Product Details */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4 relative">
              {/* Sticky Breadcrumb */}
              <div className="sticky top-24 z-10 bg-background/95 backdrop-blur-sm pb-4 mb-4">
                <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Link to="/" className="hover:text-foreground transition-colors">
                    Domů
                  </Link>
                  <span>/</span>
                  <Link to={product.categoryPath} className="hover:text-foreground transition-colors">
                    {product.category}
                  </Link>
                  <span>/</span>
                  <span className="text-foreground">{product.title}</span>
                </nav>
              </div>
              <div 
                className="aspect-square overflow-hidden rounded-2xl bg-muted relative group"
                onTouchStart={(e) => {
                  if (product.images.length <= 1) return;
                  const touch = e.touches[0];
                  touchStartX.current = touch.clientX;
                  touchStartY.current = touch.clientY;
                }}
                onTouchMove={(e) => {
                  // Prevent default scrolling while swiping horizontally
                  if (touchStartX.current !== null && touchStartY.current !== null) {
                    const touch = e.touches[0];
                    const diffX = Math.abs(touch.clientX - touchStartX.current);
                    const diffY = Math.abs(touch.clientY - touchStartY.current);
                    
                    // If horizontal movement is dominant, prevent vertical scroll
                    if (diffX > diffY && diffX > 10) {
                      e.preventDefault();
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  if (product.images.length <= 1 || touchStartX.current === null || touchStartY.current === null) {
                    touchStartX.current = null;
                    touchStartY.current = null;
                    return;
                  }
                  
                  const touch = e.changedTouches[0];
                  const diffX = touch.clientX - touchStartX.current;
                  const diffY = touch.clientY - touchStartY.current;
                  
                  // Check if it's a horizontal swipe (not vertical scroll)
                  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
                    if (diffX > 0) {
                      // Swipe right - previous image
                      setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
                    } else {
                      // Swipe left - next image
                      setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
                    }
                  }
                  
                  touchStartX.current = null;
                  touchStartY.current = null;
                }}
              >
                {hasTipTag && (
                  <div className="absolute top-4 left-4 z-20 bg-gold text-primary px-4 py-1.5 text-base font-semibold rounded-full shadow-md border border-primary/10 pointer-events-none transform-gpu backface-hidden">
                    Náš tip
                  </div>
                )}
                <img
                  ref={productImageRef}
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500"
                />
                {/* Navigation Arrows */}
                {product.images.length > 1 && (
                  <>
                    {/* Left Arrow */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
                      aria-label="Předchozí fotka"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {/* Right Arrow */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
                      aria-label="Další fotka"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.slice(0, 3).map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square overflow-hidden rounded-lg transition-all duration-300 ${
                        selectedImage === index 
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {product.images.length > 3 && (
                    <button
                      onClick={() => {
                        // Přepne na další fotku (pokud je vybraná >= 3, přepne na další)
                        if (selectedImage >= 3 && selectedImage < product.images.length - 1) {
                          setSelectedImage(selectedImage + 1);
                        } else if (selectedImage >= 3) {
                          setSelectedImage(3);
                        } else {
                          setSelectedImage(3);
                        }
                      }}
                      className={`aspect-square overflow-hidden rounded-lg transition-all duration-300 relative ${
                        selectedImage >= 3 
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                    >
                      <img
                        src={product.images[selectedImage >= 3 ? selectedImage : 3]}
                        alt={`${product.title} ${(selectedImage >= 3 ? selectedImage : 3) + 1}`}
                        className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-white font-semibold text-lg">
                          +{product.images.length - 4}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-serif font-bold text-foreground mb-4">
                  {product.title}
                </h1>
                <p className="text-2xl font-semibold text-price-gold font-serif">
                  {product.price}
                </p>
                
                {/* Inventory Status */}
                <div className="mt-4">
                  {inventoryLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Načítám skladové zásoby...</span>
                    </div>
                  ) : inventoryError ? (
                    <span className="text-sm text-muted-foreground">Skladové zásoby nejsou k dispozici</span>
                  ) : inventory !== null ? (
                    <p className={`text-sm ${
                      inventory > 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {inventory > 0 ? 'Skladem' : 'Není skladem'}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Popis</h3>
                <p className="text-muted-foreground leading-relaxed text-justify">
                  {product.fullDescription}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="gold"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={items.some(item => item.id === product.id) || (inventory !== null && inventory === 0)}
                    className={`${
                      items.some(item => item.id === product.id)
                        ? 'bg-primary/80 hover:bg-primary/90 border border-primary/30 text-primary-foreground shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300'
                        : (inventory !== null && inventory === 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : ''
                    }`}
                  >
                    {items.some(item => item.id === product.id)
                      ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Přidáno do košíku
                        </>
                      )
                      : (inventory !== null && inventory === 0)
                        ? 'Vyprodáno'
                        : 'Přidat do košíku'
                    }
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className={`group px-6 py-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 ${
                      isFavorite(product.id)
                        ? 'border-red-500 hover:border-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                        : 'hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/10'
                    }`}
                    onClick={handleToggleFavorite}
                    disabled={favoritesLoading}
                  >
                    <Heart 
                      className={`h-5 w-5 mr-2 transition-all duration-300 ${
                        isFavorite(product.id)
                          ? 'fill-red-500 text-red-500 scale-110'
                          : 'group-hover:scale-110 group-hover:fill-red-400 group-hover:text-red-400'
                      }`}
                    />
                    {isFavorite(product.id) ? 'Oblíbené' : 'Oblíbit'}
                  </Button>
                </div>
                
                {/* Back in Stock Notification */}
                {inventory !== null && inventory === 0 && product.variants?.[0] && (
                  <BackInStockNotification
                    variantId={product.variants[0].id}
                    productTitle={product.title}
                    isOutOfStock={inventory === 0}
                  />
                )}
              </div>

              <div className="pt-6 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-foreground">Kategorie:</span>
                    <p className="text-muted-foreground">{product.category}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Materiál:</span>
                    <p className="text-muted-foreground">Přírodní materiály</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Výroba:</span>
                    <p className="text-muted-foreground">Ruční výroba</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Původ:</span>
                    <p className="text-muted-foreground">Česká republika</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Skladem:</span>
                    <p className="text-muted-foreground">
                      {inventoryLoading ? (
                        <span className="flex items-center space-x-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                          <span>Načítám...</span>
                        </span>
                      ) : inventoryError ? (
                        <span className="text-muted-foreground">Není k dispozici</span>
                      ) : inventory !== null ? (
                        <span className={`font-medium ${
                          inventory > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {inventory > 0 ? 'Skladem' : 'Není skladem'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </p>
                  </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Recommendations */}
      <ProductRecommendations 
        currentProductId={product.id}
        currentCategory={product.category}
      />

      <Footer />
    </div>
  );
};

export default ProductDetailPage;