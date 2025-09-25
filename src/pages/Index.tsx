import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import ProductSection from '@/components/ProductSection';
import Slideshow from '@/components/Slideshow';
import Footer from '@/components/Footer';
import { getProductsByCollection, collectionMapping } from '@/lib/shopify';

// Import product images for fallback
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const Index = () => {
  const [productCategories, setProductCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Collection mapping is now imported from shopify.ts

  // Helper function to get fallback image
  const getFallbackImage = (category: string) => {
    switch (category) {
      case 'náhrdelníky': return necklaceImage;
      case 'náušnice': return earringsImage;
      case 'prsteny': return ringImage;
      case 'náramky': return braceletImage;
      default: return necklaceImage;
    }
  };

  // Fetch products from Shopify
  useEffect(() => {
    const fetchShopifyProducts = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Fetch each collection individually
        const categories = Object.keys(collectionMapping);
        const transformedCategories = [];

        for (const czechKey of categories) {
          const shopifyHandle = collectionMapping[czechKey as keyof typeof collectionMapping];
          
          try {
            const collection = await getProductsByCollection(shopifyHandle, 3);
            
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
                  image: firstImage?.url || getFallbackImage(czechKey),
                  description: product.description || 'Elegantní šperk z naší kolekce',
                  handle: product.handle
                };
              });

              transformedCategories.push({
                id: czechKey,
                title: collection.title || czechKey,
                subtitle: collection.description || `Elegantní ${czechKey} z naší kolekce`,
                products: products
              });
            } else {
              // If no products found, create empty category
              transformedCategories.push({
                id: czechKey,
                title: czechKey,
                subtitle: `Elegantní ${czechKey} z naší kolekce`,
                products: []
              });
            }
          } catch (error) {
            console.error(`Error fetching ${czechKey}:`, error);
            // Create empty category on error
            transformedCategories.push({
              id: czechKey,
              title: czechKey,
              subtitle: `Elegantní ${czechKey} z naší kolekce`,
              products: []
            });
          }
        }

        setProductCategories(transformedCategories);
      } catch (error) {
        console.error('Error fetching Shopify products:', error);
        setHasError(true);
        // Create empty categories on error
        setProductCategories(Object.keys(collectionMapping).map(key => ({
          id: key,
          title: key,
          subtitle: `Elegantní ${key} z naší kolekce`,
          products: []
        })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopifyProducts();
  }, []);

  // Add scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.fade-in-up, .fade-in-up-delayed');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />

      {/* Product Sections */}
      {isLoading ? (
        <div className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-muted rounded-lg mb-4 max-w-md mx-auto"></div>
              <div className="h-6 bg-muted rounded-lg mb-12 max-w-2xl mx-auto"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-muted rounded-2xl h-96 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        productCategories.map((category) => (
          <ProductSection
            key={category.id}
            id={category.id}
            title={category.title}
            subtitle={category.subtitle}
            products={category.products}
            categoryPath={`/${category.id}`}
          />
        ))
      )}

      {/* Error message (optional) */}
      {hasError && (
        <div className="py-8 px-6 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="max-w-7xl mx-auto">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Některé produkty nemohly být načteny z obchodu. Zkontrolujte prosím připojení k internetu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Brand Values Section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 fade-in-up">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-6 tracking-wide">
              Proč si vybrat Fairy Bloom
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Každý kousek je vytvořen s láskou a pečlivostí pro ty, kteří oceňují autentickou krásu přírody
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center fade-in-up-delayed" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-semibold text-luxury mb-4">Ruční výroba</h3>
              <p className="text-muted-foreground leading-relaxed">
                Každý šperk je pečlivě vytvořen ručně s důrazem na detail a kvalitu
              </p>
            </div>
            
            <div className="text-center fade-in-up-delayed" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-semibold text-luxury mb-4">Přírodní materiály</h3>
              <p className="text-muted-foreground leading-relaxed">
                Používáme pouze prémiové přírodní materiály a skutečné květiny
              </p>
            </div>
            
            <div className="text-center fade-in-up-delayed" style={{ animationDelay: '0.3s' }}>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-semibold text-luxury mb-4">Česká kvalita</h3>
              <p className="text-muted-foreground leading-relaxed">
                Vyrábíme v České republice s garancí nejvyšší kvality a preciznosti
              </p>
            </div>
          </div>
        </div>
      </section>

      <Slideshow />

      {/* Newsletter Signup Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-background to-primary/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="fade-in-up">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-6 tracking-wide">
              Objevte nové kolekce jako první
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Přihlaste se k odběru našeho newsletteru a získejte exkluzivní přístup k novinkám a speciálním nabídkám
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Váš e-mail"
                className="flex-1 px-6 py-4 rounded-lg border border-border bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                required
              />
              <button 
                type="submit"
                className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg font-medium tracking-wide hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105"
              >
                Odebírat
              </button>
            </form>
            
            <p className="text-sm text-muted-foreground mt-4">
              Vaše údaje jsou v bezpečí. Newsletter můžete kdykoliv odhlásit.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
