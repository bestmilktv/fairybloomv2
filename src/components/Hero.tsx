import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-jewelry.jpg';

const Hero = () => {
  const scrollToProducts = () => {
    const element = document.getElementById('nahrdelníky');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-accent/20">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: `linear-gradient(rgba(35, 25, 15, 0.3), rgba(35, 25, 15, 0.2)), url(${heroImage})`
        }} 
      />
      
      {/* Content - no animations, static for instant loading */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-luxury-foreground mb-6 tracking-wide">
          Přírodní krása zachycená v čase
        </h2>
        
        <p className="text-xl md:text-2xl text-luxury-foreground/90 mb-8 leading-relaxed max-w-2xl mx-auto">
          Objevte naši jedinečnou kolekci šperků s opravdovými květinami z českých luk a lesů. Každý kousek je vytvořen ručně s láskou k detailu a nese v sobě kouzlo přírody.
        </p>
        
        <div className="space-y-4 md:space-y-0 md:space-x-6 md:flex md:justify-center">
          <Button variant="gold" size="lg" onClick={scrollToProducts} className="w-full md:w-auto">
            Objevit kolekce
          </Button>
          <Button variant="premium" size="lg" className="w-full md:w-auto">
            Můj příběh
          </Button>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
      </div>
    </section>
  );
};

export default Hero;