import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';
import { getProductsByCollection, getVariantInventory } from '@/lib/shopify';
import BackToHomepageButton from '@/components/BackToHomepageButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

// OPTIMALIZACE: Statická data mimo komponentu
const CATEGORY_INFO = {
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
} as const;

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

const CategoryPage = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = location.pathname.substring(1); 
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sort, setSort] = useState<string>(() => searchParams.get('razeni') || 'nejoblibenejsi');
  const [expectedProductCount, setExpectedProductCount] = useState<number>(20);

  useEffect(() => {
    setExpectedProductCount(20);
  }, [category]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [category]);

  useEffect(() => {
    const fetchShopifyProducts = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const decodedCategory = category ? decodeURIComponent(category) : null;
        const shopifyHandle = decodedCategory;
        
        if (shopifyHandle) {
          const collection = await getProductsByCollection(shopifyHandle, 20);
          
          if (collection && collection.products?.edges) {
            // OPTIMALIZACE: Krok 1 - Získat všechny produkty bez inventory (rychlé)
            const productsBasic = collection.products.edges.map((edge) => {
              const product = edge.node;
              const firstImage = product.images?.edges?.[0]?.node;
              const firstVariant = product.variants?.edges?.[0]?.node;
              
              // OPTIMALIZACE: Přidán ?width=500 pro menší obrázky na stránce kategorie
              const optimizedImageUrl = firstImage?.url 
                ? `${firstImage.url}${firstImage.url.includes('?') ? '&' : '?'}width=500`
                : getFallbackImage(decodedCategory);
              
              return {
                id: product.id,
                title: product.title,
                price: firstVariant?.price ? 
                  `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}` : 
                  'Cena na vyžádání',
                priceAmount: firstVariant?.price ? parseFloat(firstVariant.price.amount) : null,
                image: optimizedImageUrl,
                description: product.description || 'Elegantní šperk z naší kolekce',
                handle: product.handle,
                inventoryQuantity: null as number | null,
                createdAt: product.createdAt || null,
                variantId: firstVariant?.id
              };
            });

            // OPTIMALIZACE: Krok 2 - Paralelní fetch všech inventory najednou
            const inventoryPromises = productsBasic.map(p => 
              p.variantId 
                ? getVariantInventory(p.variantId).catch(() => null)
                : Promise.resolve(null)
            );
            
            const inventories = await Promise.all(inventoryPromises);

            // Krok 3 - Merge výsledků
            const products = productsBasic.map((p, i) => ({
              ...p,
              inventoryQuantity: inventories[i]
            }));

            setShopifyProducts(products);
            setExpectedProductCount(products.length || 20);
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

  const decodedCategory = category ? decodeURIComponent(category) : null;
  const categoryData = decodedCategory ? CATEGORY_INFO[decodedCategory as keyof typeof CATEGORY_INFO] : null;

  // OPTIMALIZACE: Memoizovaný callback pro změnu řazení
  const handleSortChange = useCallback((v: string) => setSort(v), []);

  useEffect(() => {
    const current = searchParams.get('razeni') || 'nejoblibenejsi';
    if (current !== sort) {
      const next = new URLSearchParams(searchParams);
      next.set('razeni', sort);
      setSearchParams(next, { replace: true });
    }
  }, [sort, searchParams, setSearchParams]);

  // OPTIMALIZACE: Memoizované řazení produktů
  const displayProducts = useMemo(() => {
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
        return products; 
    }
  }, [shopifyProducts, sort]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full justify-items-center gap-4 overflow-visible">
            <div key={`back-button-${decodedCategory}`} className="w-full max-w-[260px] p-2 fade-in-progressive-0">
              <BackToHomepageButton />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 key={`title-${decodedCategory}`} className="fade-in-progressive-1 text-5xl md:text-6xl font-serif font-bold text-primary mb-6 tracking-wide">
            {categoryData.title}
          </h1>
          <p key={`subtitle-${decodedCategory}`} className="fade-in-progressive-2 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {categoryData.subtitle}
          </p>
        </div>
      </section>

      {/* Toolbar: Sorting */}
      <section className="px-6 pb-0 overflow-visible">
        <div className="max-w-7xl mx-auto px-6 overflow-visible">
          <div key={`sort-${decodedCategory}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full justify-items-center gap-4 overflow-visible fade-in-progressive-3">
            <div className="w-full max-w-[260px] p-2">
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="h-11 rounded-full border-2 border-primary/30 bg-card text-primary font-medium shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="Seřadit" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-primary/20 bg-card shadow-xl">
                  <SelectItem value="nejoblibenejsi">Nejprodávanější</SelectItem>
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
      <section className="pt-0 pb-16 px-6 overflow-visible">
        <div className="max-w-7xl mx-auto px-6 overflow-visible">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full justify-items-center gap-4 overflow-visible pb-20">
              {Array.from({ length: expectedProductCount }).map((_, i) => (
                <div 
                  key={`placeholder-${decodedCategory}-${i}`} 
                  className="opacity-0 pointer-events-none w-full max-w-[260px] p-2"
                >
                  <div className="bg-card rounded-2xl overflow-hidden h-full flex flex-col">
                    <div className="aspect-square bg-transparent" />
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="min-h-[3.5rem] mb-2" />
                      <div className="flex-grow" />
                      <div className="space-y-2 mt-auto">
                        <div className="h-8" />
                        <div className="h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              key={`products-${decodedCategory}`}
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
