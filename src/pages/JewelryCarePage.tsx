import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const JewelryCarePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-8 tracking-wide">
            Péče o šperky
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Vaše šperky si zaslouží tu nejlepší péči, aby si zachovaly svou krásu po mnoho let
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-12">
            {/* General Care */}
            <section className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Obecná péče
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Šperky z pryskyřice s květinami jsou odolné, ale vyžadují jemnou péči. Pravidelně je otírejte měkkým, suchým hadříkem z mikrovlákna.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Vyvarujte se kontaktu s agresivními chemikáliemi, parfémy, kosmetikou a čisticími prostředky.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Před koupáním, plaváním nebo sportovními aktivitami šperky odložte.
                  </p>
                </div>
              </div>
            </section>

            {/* Storage */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Skladování
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Ukládejte šperky na suchém a tmavém místě, ideálně v původním obalu nebo v samostatné krabičce.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Zabraňte kontaktu šperků mezi sebou, aby nedošlo k poškrábání povrchu.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Vyhněte se přímému slunečnímu záření, které může časem ovlivnit barvu pryskyřice.
                  </p>
                </div>
              </div>
            </section>

            {/* Cleaning */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Čištění
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Pro běžné čištění použijte jemný hadřík navlhčený vlažnou vodou. Jemně otřete povrch a následně osušte.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Nikdy nepoužívejte abrazivní čisticí prostředky, kartáčky nebo chemikálie.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Pro hlubší čištění můžete použít jemné mýdlo a vlažnou vodu, poté důkladně opláchněte a osušte.
                  </p>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Užitečné tipy
              </h2>
              
              <div className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl p-8 space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90 italic">
                  "Každý šperk z FairyBloom je jedinečný a nese v sobě krásu přírody. Při správné péči si zachová svůj půvab a lesk po mnoho let. Vaše šperky jsou investicí do krásy a vzpomínek."
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default JewelryCarePage;

