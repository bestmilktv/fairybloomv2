import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';
import BackToHomepageButton from '@/components/BackToHomepageButton';
import { getProductsByCollection, getVariantInventory, collectionMapping } from '@/lib/shopify';
import { deslugifyCollection } from '@/lib/slugify';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const CategoryPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [collection, setCollection] = useState<any>(null);

  // Convert handle back to Czech name for display
  const category = handle ? deslugifyCollection(handle) : null;

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [handle]);

  // Fetch products from Shopify
  useEffect(() => {
    const fetchShopifyProducts = async () => {
      if (!handle) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        // Use the handle directly from the URL to query Shopify
        console.log('Fetching collection with handle:', handle);
        const collection = await getProductsByCollection(handle, 50);
        console.log('Collection response:', collection);
        
        if (collection) {
          setCollection(collection);
          
          if (collection.products?.edges && collection.products.edges.length > 0) {
            const products = await Promise.all(
              collection.products.edges.map(async (edge) => {
                const product = edge.node;
                const firstImage = product.images?.edges?.[0]?.node;
                const firstVariant = product.variants?.edges?.[0]?.node;
                
                // Fetch inventory for the first variant
                let inventoryQuantity = null;
                if (firstVariant?.id) {
                  try {
                    inventoryQuantity = await getVariantInventory(firstVariant.id);
                  } catch (error) {
                    console.error('Error fetching inventory for product:', product.title, error);
                    // Keep inventoryQuantity as null if fetch fails
                  }
                }
                
                return {
                  id: product.id,
                  title: product.title,
                  price: firstVariant?.price ? 
                    `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}` : 
                    'Cena na vyžádání',
                  image: firstImage?.url || getFallbackImage(category),
                  description: product.description || 'Elegantní šperk z naší kolekce',
                  handle: product.handle,
                  inventoryQuantity
                };
              })
            );
            
            setShopifyProducts(products);
          } else {
            // Collection exists but has no products
            setShopifyProducts([]);
          }
        } else {
          // Collection not found in Shopify
          setHasError(true);
        }
      } catch (error) {
        console.error('Error fetching Shopify products:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopifyProducts();
  }, [handle, category]);

  // Helper function to get fallback image
  const getFallbackImage = (category: string | null) => {
    if (!category) return necklaceImage;
    switch (category) {
      case 'náhrdelníky': return necklaceImage;
      case 'náušnice': return earringsImage;
      case 'prsteny': return ringImage;
      case 'náramky': return braceletImage;
      default: return necklaceImage;
    }
  };

  // Category titles and subtitles
  const categoryInfo = {
    'náhrdelníky': {
      title: 'Náhrdelníky',
      subtitle: 'Elegantní náhrdelníky s květinami zachycenými v čase',
      image: necklaceImage
    },
    'náušnice': {
      title: 'Náušnice',
      subtitle: 'Jemné náušnice pro každodenní eleganci',
      image: earringsImage
    },
    'prsteny': {
      title: 'Prsteny',
      subtitle: 'Jedinečné prsteny pro výjimečné okamžiky',
      image: ringImage
    },
    'náramky': {
      title: 'Náramky',
      subtitle: 'Stylové náramky plné přírodní krásy',
      image: braceletImage
    }
  };

  // Get category data - use Shopify collection data if available, otherwise fallback to hardcoded info
  const categoryData = collection ? {
    title: collection.title,
    subtitle: collection.description || `Elegantní ${category} z naší kolekce`,
    image: category ? categoryInfo[category as keyof typeof categoryInfo]?.image : necklaceImage
  } : (category ? categoryInfo[category as keyof typeof categoryInfo] : null);

  // Show error only if we have an error and no collection data
  if (hasError && !collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 text-center">
          <h1 className="text-4xl font-serif text-luxury">Kategorie nenalezena</h1>
          <p className="text-muted-foreground mt-4">
            Kategorie "{handle}" nebyla nalezena v obchodě.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Use Shopify products
  const displayProducts = shopifyProducts;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Back to Homepage Button */}
      <div className="pt-24 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <BackToHomepageButton />
        </div>
      </div>
      
      {/* Category Header */}
      <section className="pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-6 tracking-wide">
            {categoryData.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {categoryData.subtitle}
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg mb-4 max-w-md mx-auto"></div>
                <div className="h-6 bg-muted rounded-lg mb-12 max-w-2xl mx-auto"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-muted rounded-2xl h-96 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : hasError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                Nepodařilo se načíst produkty z obchodu. Zkontrolujte prosím připojení k internetu.
              </p>
              <div className="text-center">
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Zkusit znovu
                </button>
              </div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">V této kategorii zatím nejsou žádné produkty.</p>
            </div>
          ) : (
            <CategoryProductSection 
              category={category || ''}
              initialProducts={displayProducts}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;