import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';
import { getProductsByCollection, getVariantInventory } from '@/lib/shopify';
import BackToHomepageButton from '@/components/BackToHomepageButton';
import { createCollectionHandle } from '@/lib/slugify';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

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
            const products = await Promise.all(
              collection.products.edges.map(async (edge) => {
                const product = edge.node;
                const firstImage = product.images?.edges?.[0]?.node;
                const firstVariant = product.variants?.edges?.[0]?.node;
                let inventoryQuantity = null;
                if (firstVariant?.id) {
                  try {
                    inventoryQuantity = await getVariantInventory(firstVariant.id);
                  } catch (error) {
                    console.error('Error fetching inventory for product:', product.title, error);
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
                  createdAt: product.createdAt || null,
                  variantId: firstVariant?.id
                };
              })
            );
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

  useEffect(() => {
    const current = searchParams.get('razeni') || 'nejoblibenejsi';
    if (current !== sort) {
      const next = new URLSearchParams(searchParams);
      next.set('razeni', sort);
      setSearchParams(next, { replace: true });
    }
  }, [sort]);

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
        return products; 
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div key={`back-button-${decodedCategory}`} className="fade-in-progressive-0">
            <BackToHomepageButton />
          </div>
        </div>
      </div>
      
      <section className="pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 key={`title-${decodedCategory}`} className="fade-in-progressive-1 text-5xl md:text-6xl font-serif font-bold text-primary mb-6 tracking-wide">
            {categoryData.title}
          </h1>
          <p key={`subtitle-${decodedCategory}`} className="fade-in-progressive-2 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {categoryData.subtitle}
          </p>
        </div>
      </section>

      {/* Toolbar: Sorting */}
      {/* ZMĚNA: Odstraněn spodní padding (pb-0) */}
      <section className="px-6 pb-0 overflow-visible">
        <div className="max-w-7xl mx-auto overflow-visible flex justify-center">
          <div key={`sort-${decodedCategory}`} className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-8 overflow-visible justify-items-center fade-in-progressive-3">
            {/* ZMĚNA: max-w-[240px] (aby lícovalo s novou velikostí produktů) */}
            <div className="w-full max-w-[240px] p-2 overflow-visible flex justify-start relative z-20">
              <div className="w-56">
                <Select value={sort} onValueChange={(v) => setSort(v)}>
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
        </div>
      </section>

      {/* Products Grid */}
      {/* ZMĚNA: Odstraněn horní padding (pt-0) -> přitaženo k tlačítku */}
      <section className="pt-0 pb-16 px-6 overflow-visible">
        <div className="max-w-7xl mx-auto overflow-visible flex justify-center">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-8 w-full justify-items-center pb-12">
                {Array.from({ length: expectedProductCount }).map((_, i) => (
                  // Placeholder upraven na max-w-[240px]
                  <div 
                    key={`placeholder-${decodedCategory}-${i}`} 
                    className="opacity-0 pointer-events-none w-full max-w-[240px] p-2"
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
            <div className="flex justify-center w-full">
              <CategoryProductSection 
                key={`products-${decodedCategory}`}
                category={decodedCategory || ''}
                initialProducts={displayProducts}
              />
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;