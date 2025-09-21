import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';
import { getProductsByCollection } from '@/lib/shopify';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const CategoryPage = () => {
  const location = useLocation();
  const category = location.pathname.substring(1); // Remove leading slash
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Collection mapping for Shopify
  const collectionMapping = {
    'náhrdelníky': 'necklaces',
    'náušnice': 'earrings', 
    'prsteny': 'rings',
    'náramky': 'bracelets'
  };

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
        const shopifyHandle = decodedCategory ? collectionMapping[decodedCategory as keyof typeof collectionMapping] : null;
        
        if (shopifyHandle) {
          const collection = await getProductsByCollection(shopifyHandle, 20);
          
          if (collection && collection.products?.edges) {
            const products = collection.products.edges.map(edge => {
              const product = edge.node;
              const firstImage = product.images?.edges?.[0]?.node;
              const firstVariant = product.variants?.edges?.[0]?.node;
              
              return {
                id: product.id,
                title: product.title,
                price: firstVariant?.price ? 
                  `${parseFloat(firstVariant.price.amount).toLocaleString('cs-CZ')} ${firstVariant.price.currencyCode}` : 
                  'Cena na vyžádání',
                image: firstImage?.url || getFallbackImage(decodedCategory),
                description: product.description || 'Elegantní šperk z naší kolekce',
                handle: product.handle
              };
            });
            
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
      case 'náhrdelníky': return necklaceImage;
      case 'náušnice': return earringsImage;
      case 'prsteny': return ringImage;
      case 'náramky': return braceletImage;
      default: return necklaceImage;
    }
  };

  // All products data
  const allProducts = {
    'náhrdelníky': {
      title: 'Náhrdelníky',
      subtitle: 'Elegantní náhrdelníky s květinami zachycenými v čase',
      image: necklaceImage,
      products: [
        {
          id: 'n1',
          title: 'Růžové okvětí',
          price: '2 890 Kč',
          image: necklaceImage,
          description: 'Jemný náhrdelník s růžovými okvětními lístky v průzračné pryskyřici.'
        },
        {
          id: 'n2',
          title: 'Lesní kapradina',
          price: '3 200 Kč',
          image: necklaceImage,
          description: 'Minimalistický design s jemnou kapradinou z českých lesů.'
        },
        {
          id: 'n3',
          title: 'Loučka v létě',
          price: '2 650 Kč',
          image: necklaceImage,
          description: 'Barevná směs lučních květů zachycená v elegantním náhrdelníku.'
        },
        {
          id: 'n4',
          title: 'Zimní kouzlo',
          price: '3 100 Kč',
          image: necklaceImage,
          description: 'Křehké zimní větvičky s drobnými krystalky.'
        },
        {
          id: 'n5',
          title: 'Jarní probuzení',
          price: '2 750 Kč',
          image: necklaceImage,
          description: 'Mladé lístky a první jarní květy v jemném náhrdelníku.'
        },
        {
          id: 'n6',
          title: 'Podzimní symfonie',
          price: '3 000 Kč',
          image: necklaceImage,
          description: 'Teplé podzimní barvy listů zachycené v elegantním tvaru.'
        }
      ]
    },
    'náušnice': {
      title: 'Náušnice',
      subtitle: 'Jemné náušnice pro každodenní eleganci',
      image: earringsImage,
      products: [
        {
          id: 'e1',
          title: 'Pomněnkové kapky',
          price: '1 890 Kč',
          image: earringsImage,
          description: 'Drobné náušnice s modrými pomněnkami v kapkovitém tvaru.'
        },
        {
          id: 'e2',
          title: 'Zlaté slunce',
          price: '2 100 Kč',
          image: earringsImage,
          description: 'Kruhové náušnice se žlutými květy a zlatými akcenty.'
        },
        {
          id: 'e3',
          title: 'Bílá čistota',
          price: '1 750 Kč',
          image: earringsImage,
          description: 'Minimalistické náušnice s drobnými bílými květy.'
        },
        {
          id: 'e4',
          title: 'Levandulové sny',
          price: '1 950 Kč',
          image: earringsImage,
          description: 'Dlouhé náušnice s větvičkami levandule.'
        },
        {
          id: 'e5',
          title: 'Růžový úsvit',
          price: '2 200 Kč',
          image: earringsImage,
          description: 'Jemné náušnice s růžovými květy sakury.'
        }
      ]
    },
    'prsteny': {
      title: 'Prsteny',
      subtitle: 'Jedinečné prsteny pro výjimečné okamžiky',
      image: ringImage,
      products: [
        {
          id: 'r1',
          title: 'Věčná láska',
          price: '3 500 Kč',
          image: ringImage,
          description: 'Romantický prsten s červenými růžemi a zlatým rámem.'
        },
        {
          id: 'r2',
          title: 'Přírodní elegance',
          price: '2 900 Kč',
          image: ringImage,
          description: 'Široký prsten s mozaikou drobných polních květů.'
        },
        {
          id: 'r3',
          title: 'Ranní rosa',
          price: '3 200 Kč',
          image: ringImage,
          description: 'Jemný prsten s bílými květy a perleťovými akcenty.'
        },
        {
          id: 'r4',
          title: 'Tajemný les',
          price: '3 800 Kč',
          image: ringImage,
          description: 'Masivní prsten s kapradinami a mechem.'
        }
      ]
    },
    'náramky': {
      title: 'Náramky',
      subtitle: 'Stylové náramky plné přírodní krásy',
      image: braceletImage,
      products: [
        {
          id: 'b1',
          title: 'Zahradní sen',
          price: '2 400 Kč',
          image: braceletImage,
          description: 'Široký náramek s různobarevnými zahradními květy.'
        },
        {
          id: 'b2',
          title: 'Lesní stezka',
          price: '2 100 Kč',
          image: braceletImage,
          description: 'Náramek inspirovaný procházkou lesem s kapradinami a mechem.'
        },
        {
          id: 'b3',
          title: 'Levandulové pole',
          price: '2 650 Kč',
          image: braceletImage,
          description: 'Elegantní náramek s levandulí a stříbrnými detaily.'
        },
        {
          id: 'b4',
          title: 'Mořská bříza',
          price: '2 300 Kč',
          image: braceletImage,
          description: 'Jemný náramek s mořskými řasami a perletí.'
        }
      ]
    }
  };

  // URL decode the category name to handle Czech characters properly
  const decodedCategory = category ? decodeURIComponent(category) : null;
  const categoryData = decodedCategory ? allProducts[decodedCategory as keyof typeof allProducts] : null;

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

  // Use Shopify products if available, otherwise fallback to static data
  const displayProducts = shopifyProducts.length > 0 ? shopifyProducts : categoryData.products;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Category Header */}
      <section className="pt-32 pb-16 px-6">
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
              <p className="text-muted-foreground mb-6">Nepodařilo se načíst produkty z obchodu. Zobrazujeme statické produkty.</p>
              <CategoryProductSection 
                category={decodedCategory || ''}
                initialProducts={categoryData.products}
              />
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