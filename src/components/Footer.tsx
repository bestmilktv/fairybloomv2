import { Heart, Instagram, Facebook, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
const Footer = () => {
  return <footer className="bg-luxury text-luxury-foreground py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-serif font-semibold mb-4 tracking-wide">Fairy Bloom</h3>
            <p className="text-luxury-foreground/80 leading-relaxed mb-6 max-w-md">
              Ručně vyráběné šperky z pryskyřice s pravými květinami. 
              Každý kousek je jedinečný a nese v sobě krásu přírody.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-gold">Kategorie</h4>
            <ul className="space-y-2">
              <li><Link to="/náhrdelníky" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náhrdelníky</Link></li>
              <li><Link to="/náušnice" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náušnice</Link></li>
              <li><Link to="/prsteny" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Prsteny</Link></li>
              <li><Link to="/náramky" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náramky</Link></li>
            </ul>
          </div>
          
          {/* Info */}
          <div>
            <h4 className="font-semibold mb-4 text-gold">Informace</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">O nás</a></li>
              <li><a href="#" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Péče o šperky</a></li>
              <li><a href="#" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Doprava</a></li>
              <li><a href="#" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Kontakt</a></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="border-t border-luxury-foreground/20 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-luxury-foreground/60 text-sm mb-4 md:mb-0">© 2025 Fairy Bloom. Všechna práva vyhrazena.</p>
          <p className="text-luxury-foreground/60 text-sm flex items-center">
            Vyrobeno s <Heart className="h-4 w-4 mx-1 text-gold" /> v České republice
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;