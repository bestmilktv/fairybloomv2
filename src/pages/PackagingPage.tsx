import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PackagingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary mb-8 tracking-wide">
            Balení
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Každý šperk zaslouží prémiové balení, které odráží jeho jedinečnou krásu
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-12">
            {/* Premium Packaging */}
            <section className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary mb-6">
                Prémiové balení
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Každý šperk je pečlivě zabalen v elegantní, luxusní krabičce z prémiových materiálů, která chrání jeho krásu a zajišťuje bezpečné doručení.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Naše balení je navrženo s důrazem na detail a vytváří nezapomenutelný zážitek z rozbalování, který podtrhuje výjimečnost vašeho šperku.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Minimalistický design s jemnými detaily odráží estetiku našich šperků a vytváří harmonii mezi obsahem a obalem.
                  </p>
                </div>
              </div>
            </section>

            {/* Unboxing Experience */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary mb-6">
                Zážitek z rozbalování
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Každá krabička je opatřena jemnou stuhou a pečetí, která symbolizuje ruční výrobu a pozornost věnovanou každému detailu.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Uvnitř najdete šperk bezpečně uložený v měkkém, sametovém obalu, který zajišťuje maximální ochranu během přepravy.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Rozbalování vašeho šperku je navrženo jako okamžik radosti a očekávání, který podtrhuje význam tohoto jedinečného daru.
                  </p>
                </div>
              </div>
            </section>

            {/* Certificate & Care */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary mb-6">
                Certifikát a péče
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Každá objednávka obsahuje certifikát autentičnosti, který potvrzuje ruční výrobu a jedinečnost vašeho šperku.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Součástí balení jsou také podrobné informace o péči o šperk, které vám pomohou zachovat jeho krásu po mnoho let.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Luxusní krabička může sloužit i jako elegantní úložný prostor pro váš šperk, čímž se stává součástí celého zážitku.
                  </p>
                </div>
              </div>
            </section>

            {/* Sustainability */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-primary mb-6">
                Udržitelnost
              </h2>
              
              <div className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl p-8 space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90">
                  Naše balení je navrženo s ohledem na životní prostředí. Používáme recyklovatelné materiály a minimalizujeme odpad, aniž bychom kompromitovali luxusní zážitek z rozbalování.
                </p>
                <p className="text-lg leading-relaxed text-foreground/90 italic">
                  "Krása spočívá v detailech, a to platí i pro způsob, jakým předáváme naše šperky do vašich rukou."
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

export default PackagingPage;
