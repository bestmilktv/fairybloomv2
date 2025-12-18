import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProductsByCollection, getProductByHandle } from '@/lib/shopify';
import { slideshowConfig } from '@/config/slideshow';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, scaleUp } from '@/utils/animations';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: string;
  ctaLink?: string;
}

const AUTO_ADVANCE_DELAY = 5000;

const Slideshow = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(1);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const isTransitioningRef = useRef(false);
  const [needsReset, setNeedsReset] = useState<{ type: 'start' | 'end' } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch slideshow data based on configuration
  useEffect(() => {
    const fetchSlideshowData = async () => {
      try {
        setIsLoading(true);
        
        // Sort config by order and filter enabled slides
        const enabledConfigs = slideshowConfig
          .filter(config => config.enabled)
          .sort((a, b) => a.order - b.order);
        
        const slidesData: Slide[] = [];
        
        for (const config of enabledConfigs) {
          try {
            if (config.type === 'custom') {
              // Custom static banner
              slidesData.push({
                id: `custom-${config.order}`,
                title: config.title || 'Nová kolekce',
                subtitle: config.subtitle || 'Elegantní šperky',
                description: config.description || 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
                image: config.image || '/placeholder.jpg',
                cta: config.cta || 'Zobrazit kolekci',
                ctaLink: config.ctaLink,
              });
            } else if (config.type === 'collection' && config.shopifyHandle) {
              // Collection banner - fetch from Shopify
              const collection = await getProductsByCollection(config.shopifyHandle, 1);
              
              if (collection && collection.products?.edges.length > 0) {
                const firstProduct = collection.products.edges[0].node;
                const firstImage = firstProduct.images?.edges?.[0]?.node;
                
                // OPTIMALIZACE: Přidán ?width=1200 pro slideshow banner
                const optimizedImageUrl = firstImage?.url 
                  ? `${firstImage.url}${firstImage.url.includes('?') ? '&' : '?'}width=1200`
                  : '/placeholder.jpg';
                
                slidesData.push({
                  id: `collection-${config.shopifyHandle}`,
                  title: config.customTitle || collection.title || 'Nová kolekce',
                  subtitle: config.customSubtitle || firstProduct.title || 'Elegantní šperky',
                  description: config.customDescription || firstProduct.description || collection.description || 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
                  image: optimizedImageUrl,
                  cta: config.customCta || 'Zobrazit kolekci',
                  ctaLink: `/${config.shopifyHandle}`,
                });
              }
            } else if (config.type === 'product' && config.shopifyHandle) {
              // Product banner - fetch from Shopify
              const product = await getProductByHandle(config.shopifyHandle);
              
              if (product) {
                const firstImage = product.images?.edges?.[0]?.node;
                
                // OPTIMALIZACE: Přidán ?width=1200 pro slideshow banner
                const optimizedProductImageUrl = firstImage?.url 
                  ? `${firstImage.url}${firstImage.url.includes('?') ? '&' : '?'}width=1200`
                  : '/placeholder.jpg';
                
                slidesData.push({
                  id: `product-${config.shopifyHandle}`,
                  title: config.customTitle || product.title || 'Nový produkt',
                  subtitle: config.customSubtitle || 'Exkluzivní design',
                  description: config.customDescription || product.description || 'Objevte tento jedinečný šperk.',
                  image: optimizedProductImageUrl,
                  cta: config.customCta || 'Zobrazit produkt',
                  ctaLink: `/produkt/${config.shopifyHandle}`,
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching slide data for ${config.type} ${config.shopifyHandle}:`, error);
            // Continue with other slides even if one fails
          }
        }
        
        // Fallback slides if no slides were loaded
        if (slidesData.length === 0) {
          slidesData.push(
            {
              id: 'fallback-1',
              title: 'Nová kolekce',
              subtitle: 'Elegantní šperky',
              description: 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
              image: '/placeholder.jpg',
              cta: 'Zobrazit kolekci',
            },
            {
              id: 'fallback-2',
              title: 'Limitovaná edice',
              subtitle: 'Exkluzivní designy',
              description: 'Exkluzivní série s jedinečnými designy. Pouze omezené množství.',
              image: '/placeholder.jpg',
              cta: 'Koupit nyní',
            },
            {
              id: 'fallback-3',
              title: 'Personalizace',
              subtitle: 'Váš jedinečný šperk',
              description: 'Vytvořte si šperk podle svých představ. Vyberte si design podle svého gusta.',
              image: '/placeholder.jpg',
              cta: 'Začít vytváření',
            }
          );
        }
        
        setSlides(slidesData);
      } catch (error) {
        console.error('Error fetching slideshow data:', error);
        
        // Fallback slides on error
        setSlides([
          {
            id: 'error-1',
            title: 'Nová kolekce',
            subtitle: 'Elegantní šperky',
            description: 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
            image: '/placeholder.jpg',
            cta: 'Zobrazit kolekci',
          },
          {
            id: 'error-2',
            title: 'Limitovaná edice',
            subtitle: 'Exkluzivní designy',
            description: 'Exkluzivní série s jedinečnými designy. Pouze omezené množství.',
            image: '/placeholder.jpg',
            cta: 'Koupit nyní',
          },
          {
            id: 'error-3',
            title: 'Personalizace',
            subtitle: 'Váš jedinečný šperk',
            description: 'Vytvořte si šperk podle svých představ. Vyberte si design podle svého gusta.',
            image: '/placeholder.jpg',
            cta: 'Začít vytváření',
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlideshowData();
  }, []);

  const extendedSlides = useMemo(() => {
    if (slides.length === 0) {
      return [];
    }

    const first = slides[0];
    const last = slides[slides.length - 1];

    return [last, ...slides, first];
  }, [slides]);

  const activeSlideIndex = slides.length
    ? (currentIndex - 1 + slides.length) % slides.length
    : 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (slides.length <= 1) {
      return;
    }

    clearTimer();
    timerRef.current = setTimeout(() => {
      if (isTransitioningRef.current) {
        return; // Pokud už probíhá transition, nezačínáme nový
      }
      isTransitioningRef.current = true;
      setIsTransitionEnabled(true);
      setCurrentIndex((prev) => {
        const next = prev + 1;
        // Pokud jsme na posledním skutečném slidu, jdeme na klon prvního
        if (prev >= slides.length) {
          return slides.length + 1;
        }
        return next;
      });
    }, AUTO_ADVANCE_DELAY);
  }, [slides.length, clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (slides.length === 0) {
      clearTimer();
      setCurrentIndex(0);
      isTransitioningRef.current = false;
      return;
    }

    isTransitioningRef.current = false;
    setIsTransitionEnabled(false);
    setCurrentIndex(1);
    clearTimer();
  }, [slides.length, clearTimer]);

  useEffect(() => {
    if (slides.length <= 1) {
      clearTimer();
      return;
    }

    // Spustíme timer po každé změně currentIndex (včetně po resetu)
    startTimer();

    return () => {
      clearTimer();
    };
  }, [currentIndex, slides.length, startTimer, clearTimer]);

  useEffect(() => {
    if (!isTransitionEnabled) {
      // Po vypnutí transition počkáme jeden frame a pak ji znovu zapneme
      let rafId1: number | null = null;
      let rafId2: number | null = null;
      
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
        });
      });

      return () => {
        // OPTIMALIZACE: Cleanup všech RAF
        if (rafId1 !== null) cancelAnimationFrame(rafId1);
        if (rafId2 !== null) cancelAnimationFrame(rafId2);
      };
    }
  }, [isTransitionEnabled]);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1 || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;
    clearTimer(); // Zastavíme aktuální timer
    setIsTransitionEnabled(true);
    setCurrentIndex((prev) => {
      const next = prev + 1;
      // Pokud jsme na posledním skutečném slidu, jdeme na klon prvního
      if (prev >= slides.length) {
        return slides.length + 1;
      }
      return next;
    });
    // Timer se automaticky spustí díky useEffect, který sleduje currentIndex
  }, [slides.length, clearTimer]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1 || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;
    clearTimer(); // Zastavíme aktuální timer
    setIsTransitionEnabled(true);
    setCurrentIndex((prev) => {
      const next = prev - 1;
      // Pokud jsme na prvním skutečném slidu, jdeme na klon posledního
      if (prev <= 1) {
        return 0;
      }
      return next;
    });
    // Timer se automaticky spustí díky useEffect, který sleduje currentIndex
  }, [slides.length, clearTimer]);

  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0 || isTransitioningRef.current) {
        return;
      }

      const target = index + 1;

      clearTimer(); // Zastavíme aktuální timer
      if (currentIndex === target) {
        startTimer(); // Pokud už jsme na cílovém slidu, jen restartujeme timer
        return;
      }

      isTransitioningRef.current = true;
      setIsTransitionEnabled(true);
      setCurrentIndex(target);
      // Timer se automaticky spustí díky useEffect, který sleduje currentIndex
    },
    [slides.length, clearTimer, startTimer, currentIndex]
  );

  const handleTransitionEnd = useCallback(() => {
    if (slides.length === 0) {
      return;
    }

    // Pokud jsme na klonu posledního slidu (index 0), označíme potřebu resetu
    if (currentIndex === 0) {
      setIsTransitionEnabled(false);
      setNeedsReset({ type: 'end' });
    }
    // Pokud jsme na klonu prvního slidu (index slides.length + 1), označíme potřebu resetu
    else if (currentIndex === slides.length + 1) {
      setIsTransitionEnabled(false);
      setNeedsReset({ type: 'start' });
    } else {
      isTransitioningRef.current = false;
    }
  }, [slides.length, currentIndex]);

  // Synchronní reset pozice bez viditelné animace
  useLayoutEffect(() => {
    if (needsReset && slides.length > 0) {
      if (needsReset.type === 'end') {
        setCurrentIndex(slides.length);
        setNeedsReset(null);
        // Znovu zapneme transition v dalším frame
        requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
          isTransitioningRef.current = false;
          // Timer se automaticky spustí díky useEffect, který sleduje currentIndex
        });
      } else if (needsReset.type === 'start') {
        setCurrentIndex(1);
        setNeedsReset(null);
        // Znovu zapneme transition v dalším frame
        requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
          isTransitioningRef.current = false;
          // Timer se automaticky spustí díky useEffect, který sleduje currentIndex
        });
      }
    }
  }, [needsReset, slides.length]);

  const handleCtaClick = (ctaLink?: string) => {
    if (ctaLink) {
      navigate(ctaLink);
    }
  };

  if (isLoading) {
    return (
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10%" }}
        variants={staggerContainer(0.2)}
        className="py-20 px-6 bg-gradient-to-br from-secondary/50 to-accent/30"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={scaleUp} className="relative overflow-hidden rounded-3xl bg-card shadow-2xl">
            <div className="h-96 md:h-[500px] flex items-center justify-center">
              <div className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg mb-4 max-w-md mx-auto"></div>
                <div className="h-6 bg-muted rounded-lg mb-8 max-w-2xl mx-auto"></div>
                <div className="h-10 bg-muted rounded-lg max-w-32 mx-auto"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={staggerContainer(0.2)}
      className="py-20 px-6 bg-gradient-to-br from-secondary/50 to-accent/30"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div variants={scaleUp} className="relative overflow-hidden rounded-3xl bg-card shadow-2xl">
          {/* Slides */}
          <div 
            className="flex transition-transform duration-1000 ease-in-out"
            style={{
              transform: `translateX(calc(-${currentIndex} * 100%))`,
              transition: isTransitionEnabled ? 'transform 1.2s ease-in-out' : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedSlides.map((slide, index) => (
              <div key={`${slide.id}-${index}`} className="w-full flex-shrink-0">
                <div className="relative h-96 md:h-[500px] flex items-center">
                  {/* Background */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `linear-gradient(45deg, rgba(35, 25, 15, 0.8), rgba(35, 25, 15, 0.4)), url(${slide.image})`,
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10 max-w-2xl mx-auto text-center px-8">
                    <div className={`fade-in-up ${index === currentIndex ? 'animate-fade-in' : ''}`}>
                      <p className="text-gold font-medium mb-2 tracking-wide text-sm uppercase">
                        {slide.subtitle}
                      </p>
                      <h3 className="text-3xl md:text-5xl font-serif font-bold text-luxury-foreground mb-4 tracking-wide">
                        {slide.title}
                      </h3>
                      <p className="text-lg text-luxury-foreground/90 mb-8 leading-relaxed">
                        {slide.description}
                      </p>
                      <Button 
                        variant="gold" 
                        size="lg"
                        onClick={() => handleCtaClick(slide.ctaLink)}
                      >
                        {slide.cta}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Controls - Indicators Centered, Arrows Right */}
          <div className="absolute bottom-6 left-0 right-0 px-8 z-20 flex justify-center items-center pointer-events-none">
            {/* Indicators */}
            <div className="flex space-x-2 pointer-events-auto">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeSlideIndex 
                      ? 'bg-gold scale-125' 
                      : 'bg-luxury-foreground/30 hover:bg-luxury-foreground/50'
                  }`}
                />
              ))}
            </div>

            {/* Arrows - Right aligned */}
            <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 gap-3 pointer-events-auto">
               <button 
                  onClick={prevSlide} 
                  className="p-3 rounded-full bg-luxury-foreground/10 backdrop-blur-sm hover:bg-luxury-foreground/20 transition-all duration-300 text-luxury-foreground"
                  aria-label="Předchozí slide"
               >
                  <ChevronLeft className="h-6 w-6" />
               </button>
               <button 
                  onClick={nextSlide} 
                  className="p-3 rounded-full bg-luxury-foreground/10 backdrop-blur-sm hover:bg-luxury-foreground/20 transition-all duration-300 text-luxury-foreground"
                  aria-label="Další slide"
               >
                  <ChevronRight className="h-6 w-6" />
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Slideshow;