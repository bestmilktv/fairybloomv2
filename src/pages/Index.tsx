import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import ProductSection from '@/components/ProductSection';
import Slideshow from '@/components/Slideshow';
import Footer from '@/components/Footer';
import { getProductsByCollection } from '@/lib/shopify';
import { createCollectionPath } from '@/lib/slugify';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { toast } from '@/hooks/use-toast';

// Import product images for fallback
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const Index = () => {
  const [productCategories, setProductCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandValuesRef, brandValuesVisible] = useScrollAnimation();
  const [myStoryRef, myStoryVisible] = useScrollAnimation();
  const [newsletterRef, newsletterVisible] = useScrollAnimation();

  // Collection mapping for Shopify - using slugified handles (these are the actual Shopify handles!)
  const collectionMapping = {
    'náhrdelníky': 'nahrdelniky',  // Actual Shopify handle (slugified)
    'náušnice': 'nausnice',        // Actual Shopify handle (slugified)
    'prsteny': 'prsteny',          // Actual Shopify handle (no diacritics)
    'náramky': 'naramky'           // Actual Shopify handle (slugified)
  };

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

        const categories = Object.keys(collectionMapping);
        
        // OPTIMALIZACE: Paralelní fetch všech kolekcí najednou (místo sekvenčního)
        // Použití Promise.allSettled zachovává i selhané requesty
        const fetchPromises = categories.map(async (czechKey) => {
          const shopifyHandle = collectionMapping[czechKey as keyof typeof collectionMapping];
          try {
            // OPTIMALIZACE: 20 produktů, 1 obrázek, 1 varianta - pro homepage stačí minimum dat
            const collection = await getProductsByCollection(shopifyHandle, 20, 1, 1);
            return { czechKey, collection, error: null };
          } catch (error) {
            console.error(`Error fetching ${czechKey}:`, error);
            return { czechKey, collection: null, error };
          }
        });

        const results = await Promise.all(fetchPromises);

        // Zpracování výsledků ve správném pořadí
        const transformedCategories = results.map(({ czechKey, collection }) => {
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
                handle: product.handle,
                variantId: firstVariant?.id
              };
            });

            return {
              id: czechKey,
              title: collection.title || czechKey,
              subtitle: collection.description || `Elegantní ${czechKey} z naší kolekce`,
              products: products
            };
          } else {
            // Fallback pro prázdnou nebo chybnou kolekci
            return {
              id: czechKey,
              title: czechKey,
              subtitle: `Elegantní ${czechKey} z naší kolekce`,
              products: []
            };
          }
        });

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

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate email
    if (!newsletterEmail || !newsletterEmail.trim()) {
      toast({
        title: 'Chybí e-mail',
        description: 'Prosím zadejte svůj e-mail.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      toast({
        title: 'Neplatný e-mail',
        description: 'Prosím zadejte platnou e-mailovou adresu.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          toast({
            title: 'Již přihlášeno',
            description: data.error || 'Tento e-mail je již přihlášen k odběru newsletteru.',
          });
        } else {
          toast({
            title: 'Chyba',
            description: data.error || 'Došlo k chybě, zkuste to prosím později.',
            variant: 'destructive',
          });
        }
        return;
      }

      // Success
      toast({
        title: 'Úspěšně přihlášeno',
        description: 'Děkujeme! Úspěšně jste přihlášeni k odběru newsletteru.',
      });

      // Clear input
      setNewsletterEmail('');
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Chyba',
        description: 'Došlo k chybě, zkuste to prosím později.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            categoryPath={createCollectionPath(category.id)}
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
      <section 
        ref={brandValuesRef}
        className={`py-20 px-6 bg-background scroll-fade-in ${brandValuesVisible ? 'visible' : ''}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 fade-in-up">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 tracking-wide">
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
              <h3 className="text-2xl font-serif font-semibold text-primary mb-4">Ruční výroba</h3>
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
              <h3 className="text-2xl font-serif font-semibold text-primary mb-4">Přírodní materiály</h3>
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
              <h3 className="text-2xl font-serif font-semibold text-primary mb-4">Česká kvalita</h3>
              <p className="text-muted-foreground leading-relaxed">
                Vyrábíme v České republice s garancí nejvyšší kvality a preciznosti
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* My Story Section */}
      <section 
        id="muj-pribeh"
        ref={myStoryRef}
        className={`py-24 px-6 bg-gradient-to-br from-background via-primary/5 to-secondary/10 scroll-fade-in ${myStoryVisible ? 'visible' : ''}`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 fade-in-up">
            <h2 className="text-5xl md:text-6xl font-serif font-bold text-primary mb-4 tracking-wide">
              Můj příběh
            </h2>
          </div>
          
          <div className="space-y-8 fade-in-up-delayed" style={{ animationDelay: '0.2s' }}>
            <div className="text-center mb-4">
              <p className="text-2xl md:text-3xl font-serif font-medium text-primary/90 italic leading-relaxed max-w-3xl mx-auto">
                Každý detail má svůj význam.<br />
                Každý okamžik si zaslouží být výjimečný.
              </p>
            </div>

            <div className="prose prose-lg max-w-none text-foreground/90 leading-relaxed space-y-6">
              <p className="text-lg md:text-xl leading-relaxed">
                Jmenuji se <span className="font-semibold text-primary">Terka</span> a FairyBloom vznikl z touhy tvořit něco víc než jen šperky – chtěla jsem vytvořit zážitek, který lidem připomene krásu jednoduchosti a sílu osobních příběhů.
              </p>
              
              <p className="text-lg md:text-xl leading-relaxed">
                Věřím, že pravý luxus nespočívá v lesku, ale v emocích, které v nás zůstávají. Každý kousek z FairyBloom proto navrhujeme tak, aby byl nejen esteticky dokonalý, ale hlavně osobní – spojený s významem, vzpomínkou, momentem.
              </p>
              
              <p className="text-lg md:text-xl leading-relaxed">
                Naším cílem není zaplavit svět dalšími produkty, ale vytvářet věci, které něco znamenají. Každý šperk, který projde našima rukama, má svůj důvod, svůj příběh a své místo – stejně jako vy.
              </p>
              
              <div className="mt-12 pt-8 border-t border-primary/20">
                <p className="text-xl md:text-2xl font-serif font-semibold text-primary text-center leading-relaxed">
                  FairyBloom není jen značka.<br />
                  <span className="font-normal italic">Je to filozofie pomalé krásy, která se rodí z klidu, péče a respektu k detailu.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Slideshow />

      {/* Newsletter Signup Section */}
      <section 
        ref={newsletterRef}
        className={`py-20 px-6 bg-gradient-to-br from-background to-primary/5 scroll-fade-in ${newsletterVisible ? 'visible' : ''}`}
      >
        <div className="max-w-2xl mx-auto text-center">
          <div className="fade-in-up">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 tracking-wide">
              Objevte nové kolekce jako první
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Přihlaste se k odběru našeho newsletteru a získejte exkluzivní přístup k novinkám a speciálním nabídkám
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Váš e-mail"
                className="flex-1 px-6 py-4 rounded-lg border border-border bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                required
                disabled={isSubmitting}
              />
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-primary/80 hover:bg-primary/90 text-primary-foreground rounded-lg font-medium tracking-wide shadow-lg hover:shadow-lg transition-[background-color,transform,box-shadow] duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? 'Odesílám...' : 'Odebírat'}
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
