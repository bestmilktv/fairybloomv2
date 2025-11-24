import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const ShippingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-8 tracking-wide">
            Doprava
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Vaše objednávky doručujeme s péčí a pozorností, kterou si zaslouží
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-12">
            {/* Shipping Options */}
            <section className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Možnosti dopravy
              </h2>
              
              <div className="space-y-6">
                <div className="border border-primary/20 rounded-2xl p-6 hover:border-primary/40 transition-colors duration-300">
                  <h3 className="text-2xl font-serif font-semibold text-luxury mb-3">
                    Standardní doprava
                  </h3>
                  <p className="text-lg leading-relaxed text-foreground/90 mb-2">
                    Doba doručení: 3-5 pracovních dnů
                  </p>
                  <p className="text-muted-foreground">
                    Vaše objednávka bude odeslána prostřednictvím České pošty nebo Zásilkovny. Sledování zásilky obdržíte e-mailem po odeslání.
                  </p>
                </div>
                
                <div className="border border-primary/20 rounded-2xl p-6 hover:border-primary/40 transition-colors duration-300">
                  <h3 className="text-2xl font-serif font-semibold text-luxury mb-3">
                    Expresní doprava
                  </h3>
                  <p className="text-lg leading-relaxed text-foreground/90 mb-2">
                    Doba doručení: 1-2 pracovní dny
                  </p>
                  <p className="text-muted-foreground">
                    Pro ty, kteří potřebují svůj šperk co nejdříve. Expresní doprava zajišťuje nejrychlejší možné doručení.
                  </p>
                </div>
                
                <div className="border border-primary/20 rounded-2xl p-6 hover:border-primary/40 transition-colors duration-300">
                  <h3 className="text-2xl font-serif font-semibold text-luxury mb-3">
                    Osobní odběr
                  </h3>
                  <p className="text-lg leading-relaxed text-foreground/90 mb-2">
                    Dostupné po předchozí domluvě
                  </p>
                  <p className="text-muted-foreground">
                    Pokud preferujete osobní odběr, kontaktujte nás a domluvíme se na termínu a místě předání.
                  </p>
                </div>
              </div>
            </section>

            {/* Shipping Costs */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Ceny dopravy
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-primary/10">
                  <span className="text-lg text-foreground/90">Standardní doprava</span>
                  <span className="text-lg font-semibold text-luxury">Dle tarifu dopravce</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-primary/10">
                  <span className="text-lg text-foreground/90">Expresní doprava</span>
                  <span className="text-lg font-semibold text-luxury">Dle tarifu dopravce</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-primary/10">
                  <span className="text-lg text-foreground/90">Osobní odběr</span>
                  <span className="text-lg font-semibold text-luxury">Zdarma</span>
                </div>
              </div>
            </section>

            {/* Packaging */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Balení
              </h2>
              
              <div className="space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90">
                  Každý šperk je pečlivě zabalen v prémiovém balení, které chrání jeho krásu a zajišťuje bezpečné doručení. Naše balení je navrženo s důrazem na detail a luxusní zážitek z rozbalování.
                </p>
                
                <div className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl p-6">
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Každá objednávka obsahuje certifikát autentičnosti a informace o péči o šperk.
                  </p>
                </div>
              </div>
            </section>

            {/* International Shipping */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Mezinárodní doprava
              </h2>
              
              <p className="text-lg leading-relaxed text-foreground/90">
                Pro mezinárodní objednávky nás prosím kontaktujte předem. Rádi vám připravíme individuální nabídku dopravy a pomůžeme s celními formalitami.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ShippingPage;

