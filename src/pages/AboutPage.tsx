import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-8 tracking-wide">
            O nás
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Každý detail má svůj význam. Každý okamžik si zaslouží být výjimečný.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-8">
            <div className="space-y-6">
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
                Jmenuji se <span className="font-semibold text-luxury">Terka</span> a FairyBloom vznikl z touhy tvořit něco víc než jen šperky – chtěla jsem vytvořit zážitek, který lidem připomene krásu jednoduchosti a sílu osobních příběhů.
              </p>
              
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
                Věřím, že pravý luxus nespočívá v lesku, ale v emocích, které v nás zůstávají. Každý kousek z FairyBloom proto navrhujeme tak, aby byl nejen esteticky dokonalý, ale hlavně osobní – spojený s významem, vzpomínkou, momentem.
              </p>
              
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
                Naším cílem není zaplavit svět dalšími produkty, ale vytvářet věci, které něco znamenají. Každý šperk, který projde našima rukama, má svůj důvod, svůj příběh a své místo – stejně jako vy.
              </p>
            </div>

            <div className="mt-16 pt-12 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-8 text-center">
                Naše hodnoty
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-luxury mb-4">Ruční výroba</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Každý šperk je pečlivě vytvořen ručně s důrazem na detail a kvalitu
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-luxury mb-4">Přírodní materiály</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Používáme pouze prémiové přírodní materiály a skutečné květiny
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-luxury mb-4">Česká kvalita</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Vyrábíme v České republice s garancí nejvyšší kvality a preciznosti
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-12 border-t border-primary/20 text-center">
              <p className="text-2xl md:text-3xl font-serif font-semibold text-luxury leading-relaxed">
                FairyBloom není jen značka.<br />
                <span className="font-normal italic">Je to filozofie pomalé krásy, která se rodí z klidu, péče a respektu k detailu.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AboutPage;

