import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';
import { getProductsByCollection, getVariantInventory } from '@/lib/shopify';
import BackToHomepageButton from '@/components/BackToHomepageButton';
import { createCollectionHandle } from '@/lib/slugify';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const CategoryPage = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = location.pathname.substring(1); // Remove leading slash
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sort, setSort] = useState<string>(() => searchParams.get('razeni') || 'nejoblibenejsi');


  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [category]);

  // Fetch products from Shopify
  useEffect(() => {
    const fetchShopifyProducts = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const decodedCategory = category ? decodeURIComponent(category) : null;
        // Direct mapping from slugified URL to Shopify handle
        const shopifyHandle = decodedCategory;
        
        
        if (shopifyHandle) {
          const collection = await getProductsByCollection(shopifyHandle, 20);
          
          if (collection && collection.products?.edges) {
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
                  priceAmount: firstVariant?.price ? parseFloat(firstVariant.price.amount) : null,
                  image: firstImage?.url || getFallbackImage(decodedCategory),
                  description: product.description || 'Elegantní šperk z naší kolekce',
                  handle: product.handle,
                  inventoryQuantity,
                  createdAt: product.createdAt || null
                };
              })
            );
            
            setShopifyProducts(products);
          } else {
            setHasError(true);
          }
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error fetching Shopify products:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (category) {
      fetchShopifyProducts();
    }
  }, [category]);

  // Helper function to get fallback image
  const getFallbackImage = (category: string | null) => {
    if (!category) return necklaceImage;
    switch (category) {
      case 'nahrdelniky': return necklaceImage;
      case 'nausnice': return earringsImage;
      case 'prsteny': return ringImage;
      case 'naramky': return braceletImage;
      default: return necklaceImage;
    }
  };

  // Category titles and subtitles
  const categoryInfo = {
    'nahrdelniky': {
      title: 'Náhrdelníky',
      subtitle: 'Elegantní náhrdelníky s květinami zachycenými v čase',
      image: necklaceImage
    },
    'nausnice': {
      title: 'Náušnice',
      subtitle: 'Jemné náušnice pro každodenní eleganci',
      image: earringsImage
    },
    'prsteny': {
      title: 'Prsteny',
      subtitle: 'Jedinečné prsteny pro výjimečné okamžiky',
      image: ringImage
    },
    'naramky': {
      title: 'Náramky',
      subtitle: 'Stylové náramky plné přírodní krásy',
      image: braceletImage
    }
  };

  // URL decode the category name to handle Czech characters properly
  const decodedCategory = category ? decodeURIComponent(category) : null;
  const categoryData = decodedCategory ? categoryInfo[decodedCategory as keyof typeof categoryInfo] : null;

  if (!categoryData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 text-center">
          <h1 className="text-4xl font-serif text-luxury">Kategorie nenalezena</h1>
        </div>
        <Footer />
      </div>
    );
  }

  // Sync sort to URL when changed
  useEffect(() => {
    const current = searchParams.get('razeni') || 'nejoblibenejsi';
    if (current !== sort) {
      const next = new URLSearchParams(searchParams);
      next.set('razeni', sort);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Use Shopify products and apply sorting
  const displayProducts = (() => {
    const products = [...shopifyProducts];
    switch (sort) {
      case 'nejlevnejsi':
        return products.sort((a, b) => (a.priceAmount ?? Infinity) - (b.priceAmount ?? Infinity));
      case 'nejdrazsi':
        return products.sort((a, b) => (b.priceAmount ?? -Infinity) - (a.priceAmount ?? -Infinity));
      case 'nejnovejsi':
        return products.sort((a, b) => {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
      case 'nejoblibenejsi':
      default:
        return products; // Keep original API order
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Back to Homepage Button */}
      <div className="pt-24 px-6 py-6">
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

      {/* Toolbar: Sorting */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-start fade-in-up">
            <div className="w-56">
              <Select value={sort} onValueChange={(v) => setSort(v)}>
                <SelectTrigger className="h-11 rounded-full border-muted/60 bg-background/60 backdrop-blur text-sm">
                  <SelectValue placeholder="Seřadit" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-muted/60">
                  <SelectItem value="nejoblibenejsi">Nejoblíbenější</SelectItem>
                  <SelectItem value="nejlevnejsi">Nejlevnější</SelectItem>
                  <SelectItem value="nejdrazsi">Nejdražší</SelectItem>
                  <SelectItem value="nejnovejsi">Nejnovější</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
              <p className="text-muted-foreground mb-6">Nepodařilo se načíst produkty z obchodu. Zkontrolujte prosím připojení k internetu.</p>
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
              category={decodedCategory || ''}
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