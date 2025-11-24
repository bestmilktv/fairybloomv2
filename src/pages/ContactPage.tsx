import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Mail, Instagram, Facebook } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-8 tracking-wide">
            Kontakt
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Jsme tu pro vás. Rádi zodpovíme vaše dotazy a pomůžeme vám najít ten pravý šperk
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-12">
            {/* Contact Methods */}
            <section className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Email */}
                <div className="border border-primary/20 rounded-2xl p-8 hover:border-primary/40 transition-colors duration-300 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-luxury mb-4">
                    E-mail
                  </h3>
                  <p className="text-lg text-muted-foreground mb-4">
                    Napište nám na
                  </p>
                  <a 
                    href="mailto:info@fairybloom.cz" 
                    className="text-lg font-medium text-luxury hover:text-gold transition-colors duration-300"
                  >
                    info@fairybloom.cz
                  </a>
                  <p className="text-sm text-muted-foreground mt-4">
                    Odpovídáme obvykle do 24 hodin
                  </p>
                </div>

                {/* Social Media */}
                <div className="border border-primary/20 rounded-2xl p-8 hover:border-primary/40 transition-colors duration-300 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-luxury mb-4">
                    Sociální sítě
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    Sledujte nás a buďte v kontaktu
                  </p>
                  <div className="flex justify-center gap-4">
                    <a 
                      href="#" 
                      className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-6 w-6" />
                    </a>
                    <a 
                      href="#" 
                      className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-6 w-6" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Form Section */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Napište nám
              </h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-2">
                      Jméno a příjmení
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      placeholder="Vaše jméno"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      placeholder="vas@email.cz"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground/80 mb-2">
                    Předmět
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                    placeholder="O čem byste chtěli hovořit?"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground/80 mb-2">
                    Zpráva
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 resize-none"
                    placeholder="Vaše zpráva..."
                    required
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-4 bg-luxury text-luxury-foreground rounded-lg font-medium tracking-wide hover:shadow-lg hover:shadow-luxury/25 transition-all duration-300 transform hover:scale-105"
                >
                  Odeslat zprávu
                </button>
              </form>
            </section>

            {/* Additional Info */}
            <section className="space-y-6 pt-8 border-t border-primary/20">
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-luxury mb-6">
                Další informace
              </h2>
              
              <div className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl p-8 space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90">
                  Pokud máte dotazy ohledně konkrétního šperku, objednávky nebo potřebujete poradit s výběrem, neváhejte nás kontaktovat. Jsme tu pro vás a rádi vám pomůžeme najít ten pravý kousek, který bude dokonale odpovídat vašemu stylu a příběhu.
                </p>
                
                <p className="text-lg leading-relaxed text-foreground/90">
                  Pro individuální konzultace a osobní setkání nás prosím kontaktujte předem, abychom si mohli domluvit termín.
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

export default ContactPage;

