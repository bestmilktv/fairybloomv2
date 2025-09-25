import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ProductRecommendations } from '@/components/ProductRecommendations';
import { getProductByHandle } from '@/lib/shopify';
import BackToCollectionButton from '@/components/BackToCollectionButton';
import { createCollectionHandle } from '@/lib/slugify';

// Import product images for fallback
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const ProductDetailPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [animatingToCart, setAnimatingToCart] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [inventory, setInventory] = useState<number | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [primaryCollection, setPrimaryCollection] = useState<{handle: string, title: string} | null>(null);
  const productImageRef = useRef<HTMLImageElement>(null);

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
            inventoryQuantity: null // Will be updated when inventory is fetched
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
    if (productHandle.includes('nahr') || productHandle.includes('necklace')) return '/náhrdelníky';
    if (productHandle.includes('naus') || productHandle.includes('earring')) return '/náušnice';
    if (productHandle.includes('prst') || productHandle.includes('ring')) return '/prsteny';
    if (productHandle.includes('nara') || productHandle.includes('bracelet')) return '/náramky';
    return '/náhrdelníky';
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

  const handleAddToCart = () => {
    if (!product || animatingToCart) return;
    
    // Start animation
    setAnimatingToCart(true);
    
    // Add to cart
    const priceNumber = parseInt(product.price.replace(/[^\d]/g, ''));
    addToCart({
      id: product.id,
      name: product.title,
      price: priceNumber,
      image: product.images[0],
      category: product.category,
    });
    
    toast({
      title: "Přidáno do košíku",
      description: `${product.title} byl přidán do vašeho košíku.`,
    });
    
    // Reset animation after delay
    setTimeout(() => {
      setAnimatingToCart(false);
    }, 1000);
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
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na hlavní stránku
          </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/náhrdelníky">
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

  // Collection mapping for URL paths - using slugified handles
  const collectionMapping = {
    'nahrdelniky': createCollectionHandle('náhrdelníky'),
    'nausnice': createCollectionHandle('náušnice'), 
    'prsteny': createCollectionHandle('prsteny'),
    'naramky': createCollectionHandle('náramky')
  };

  // Debug logging
  console.log('ProductDetailPage - Product tags:', product?.tags);
  console.log('ProductDetailPage - Primary collection:', primaryCollection);
  console.log('ProductDetailPage - All collections:', product?.collections?.edges?.map(edge => edge.node));

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
              fallbackCollectionHandle={primaryCollection ? collectionMapping[primaryCollection.handle as keyof typeof collectionMapping] || primaryCollection.handle : undefined}
              fallbackCollectionTitle={primaryCollection?.title}
            />
          </div>
        </div>
      </div>
      
      {/* Breadcrumb */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
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
      </div>

      {/* Product Details */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                <img
                  ref={productImageRef}
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500"
                />
              </div>
              
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.map((image: string, index: number) => (
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
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-serif font-bold text-luxury mb-4">
                  {product.title}
                </h1>
                <p className="text-2xl font-semibold text-gold font-serif">
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
                <p className="text-muted-foreground leading-relaxed">
                  {product.fullDescription}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <Button 
                  onClick={handleAddToCart}
                  disabled={animatingToCart || (inventory !== null && inventory === 0)}
                  className={`px-8 py-4 text-lg font-medium transition-all duration-300 ${
                    animatingToCart
                      ? 'bg-green-600 hover:bg-green-700'
                      : (inventory !== null && inventory === 0)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/25'
                  }`}
                >
                  {animatingToCart 
                    ? 'Přidáno!' 
                    : (inventory !== null && inventory === 0)
                      ? 'Vyprodáno'
                      : 'Přidat do košíku'
                  }
                </Button>
                
                <Button variant="outline" size="lg" className="px-6 py-4">
                  <Heart className="h-5 w-5 mr-2" />
                  Oblíbit
                </Button>
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