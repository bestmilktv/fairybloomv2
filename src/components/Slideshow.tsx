import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { getProductsByCollection } from '@/lib/shopify';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: string;
}

const AUTO_ADVANCE_DELAY = 5000;

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [slideshowRef, slideshowVisible] = useScrollAnimation();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch featured products for slideshow
  useEffect(() => {
    const fetchSlideshowData = async () => {
      try {
        setIsLoading(true);
        
        // Get featured products from different collections
        const collections = ['nahrdelniky', 'nausnice', 'prsteny'];
        const slidesData: Slide[] = [];
        
        for (let i = 0; i < collections.length; i++) {
          const collection = await getProductsByCollection(collections[i], 1);
          
          if (collection && collection.products?.edges.length > 0) {
            const firstProduct = collection.products.edges[0].node;
            const firstImage = firstProduct.images?.edges?.[0]?.node;
            
            slidesData.push({
              id: `${i + 1}`,
              title: collection.title || 'Nová kolekce',
              subtitle: firstProduct.title,
              description: firstProduct.description || 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
              image: firstImage?.url || '/placeholder.jpg',
              cta: 'Zobrazit kolekci'
            });
          }
        }
        
        // Fallback slides if no products found
        if (slidesData.length === 0) {
          slidesData.push(
            {
              id: '1',
              title: 'Nová kolekce',
              subtitle: 'Elegantní šperky',
              description: 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
              image: '/placeholder.jpg',
              cta: 'Zobrazit kolekci'
            },
            {
              id: '2',
              title: 'Limitovaná edice',
              subtitle: 'Exkluzivní designy',
              description: 'Exkluzivní série s jedinečnými designy. Pouze omezené množství.',
              image: '/placeholder.jpg',
              cta: 'Koupit nyní'
            },
            {
              id: '3',
              title: 'Personalizace',
              subtitle: 'Váš jedinečný šperk',
              description: 'Vytvořte si šperk podle svých představ. Vyberte si design podle svého gusta.',
              image: '/placeholder.jpg',
              cta: 'Začít vytváření'
            }
          );
        }
        
        setSlides(slidesData);
      } catch (error) {
        console.error('Error fetching slideshow data:', error);
        
        // Fallback slides on error
        setSlides([
          {
            id: '1',
            title: 'Nová kolekce',
            subtitle: 'Elegantní šperky',
            description: 'Objevte naši nejnovější kolekci s jedinečnými šperky.',
            image: '/placeholder.jpg',
            cta: 'Zobrazit kolekci'
          },
          {
            id: '2',
            title: 'Limitovaná edice',
            subtitle: 'Exkluzivní designy',
            description: 'Exkluzivní série s jedinečnými designy. Pouze omezené množství.',
            image: '/placeholder.jpg',
            cta: 'Koupit nyní'
          },
          {
            id: '3',
            title: 'Personalizace',
            subtitle: 'Váš jedinečný šperk',
            description: 'Vytvořte si šperk podle svých představ. Vyberte si design podle svého gusta.',
            image: '/placeholder.jpg',
            cta: 'Začít vytváření'
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
      setIsTransitionEnabled(true);
      setCurrentIndex((prev) => prev + 1);
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
      return;
    }

    setIsTransitionEnabled(false);
    setCurrentIndex(1);
    clearTimer();
  }, [slides.length, clearTimer]);

  useEffect(() => {
    if (slides.length <= 1) {
      clearTimer();
      return;
    }

    startTimer();

    return () => {
      clearTimer();
    };
  }, [currentIndex, slides.length, startTimer, clearTimer]);

  useEffect(() => {
    if (!isTransitionEnabled) {
      const id = requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
      });

      return () => cancelAnimationFrame(id);
    }
  }, [isTransitionEnabled]);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) {
      return;
    }

    clearTimer();
    setIsTransitionEnabled(true);
    setCurrentIndex((prev) => prev + 1);
  }, [slides.length, clearTimer]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) {
      return;
    }

    clearTimer();
    setIsTransitionEnabled(true);
    setCurrentIndex((prev) => prev - 1);
  }, [slides.length, clearTimer]);

  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0) {
        return;
      }

      const target = index + 1;

      clearTimer();
      if (currentIndex === target) {
        startTimer();
        return;
      }

      setIsTransitionEnabled(true);
      setCurrentIndex(target);
    },
    [slides.length, clearTimer, startTimer, currentIndex]
  );

  const handleTransitionEnd = () => {
    if (slides.length === 0) {
      return;
    }

    if (currentIndex === slides.length + 1) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1);
    } else if (currentIndex === 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(slides.length);
    }
  };

  if (isLoading) {
    return (
      <section 
        ref={slideshowRef}
        className={`py-20 px-6 bg-gradient-to-br from-secondary/50 to-accent/30 scroll-fade-in ${slideshowVisible ? 'visible' : ''}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-card shadow-2xl">
            <div className="h-96 md:h-[500px] flex items-center justify-center">
              <div className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg mb-4 max-w-md mx-auto"></div>
                <div className="h-6 bg-muted rounded-lg mb-8 max-w-2xl mx-auto"></div>
                <div className="h-10 bg-muted rounded-lg max-w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={slideshowRef}
      className={`py-20 px-6 bg-gradient-to-br from-secondary/50 to-accent/30 scroll-fade-in ${slideshowVisible ? 'visible' : ''}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-card shadow-2xl">
          {/* Slides */}
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: isTransitionEnabled ? undefined : 'none',
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
                      <Button variant="gold" size="lg">
                        {slide.cta}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-luxury-foreground/10 backdrop-blur-sm hover:bg-luxury-foreground/20 transition-all duration-300"
          >
            <ChevronLeft className="h-6 w-6 text-luxury-foreground" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-luxury-foreground/10 backdrop-blur-sm hover:bg-luxury-foreground/20 transition-all duration-300"
          >
            <ChevronRight className="h-6 w-6 text-luxury-foreground" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
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
        </div>
      </div>
    </section>
  );
};

export default Slideshow;