import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-jewelry.jpg';

const Hero = () => {
  // Custom smooth scroll funkce s pomalejší animací (o 25% pomalejší)
  const smoothScrollTo = (targetPosition: number) => {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.abs(distance) * 1.25; // Zpomalení o 25% (1.25x delší)
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  const scrollToProducts = () => {
    const element = document.getElementById('náhrdelníky');
    if (element) {
      const navHeight = 80; // Přibližná výška navigační lišty
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navHeight;

      smoothScrollTo(offsetPosition);
    }
  };

  const scrollToMyStory = () => {
    const element = document.getElementById('muj-pribeh');
    if (element) {
      const navHeight = 80; // Přibližná výška navigační lišty
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-accent/20">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `linear-gradient(rgba(35, 25, 15, 0.3), rgba(35, 25, 15, 0.2)), url(${heroImage})`
    }} />
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-luxury-foreground mb-6 tracking-wide leading-tight" style={{ lineHeight: '1.1' }}>
          Přírodní krása<br />
          <span className="block mt-2">zachycená v čase</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-luxury-foreground/90 mb-8 leading-relaxed max-w-2xl mx-auto" style={{ minHeight: '80px' }}>
          Objevte naši jedinečnou kolekci šperků s opravdovými květinami z českých luk a lesů. Každý kousek je vytvořen ručně s láskou k detailu a nese v sobě kouzlo přírody.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6" style={{ minHeight: '60px' }}>
          <Button variant="gold" size="lg" onClick={scrollToProducts} className="w-full md:w-auto">Objevit kolekce</Button>
          <Button variant="premium" size="lg" onClick={scrollToMyStory} className="w-full md:w-auto">Můj příběh</Button>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        
      </div>
    </section>;
};
export default Hero;