import { Heart, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/utils/animations';

// TikTok Icon SVG Component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const Footer = () => {
  return (
    <div className="overflow-hidden w-full">
      <motion.footer 
        initial={{ y: "30%", opacity: 1 }} // Vyjede zespoda (30% své výšky)
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }} // Spustí se o trochu dříve
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }} // Decentní slide-out
        className="bg-luxury text-luxury-foreground py-16 px-6"
      >
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
              <a 
                href="https://www.instagram.com/fairybloom.cz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.tiktok.com/@fairybloom.cz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-luxury-foreground/60 hover:text-gold transition-colors duration-300"
                aria-label="TikTok"
              >
                <TikTokIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-gold">Kategorie</h4>
            <ul className="space-y-2">
              <li><Link to="/nahrdelniky" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náhrdelníky</Link></li>
              <li><Link to="/nausnice" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náušnice</Link></li>
              <li><Link to="/prsteny" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Prsteny</Link></li>
              <li><Link to="/naramky" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Náramky</Link></li>
            </ul>
          </div>
          
          {/* Info */}
          <div>
            <h4 className="font-semibold mb-4 text-gold">Informace</h4>
            <ul className="space-y-2">
              <li><Link to="/o-nas" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">O nás</Link></li>
              <li><Link to="/pece-o-sperky" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Péče o šperky</Link></li>
              <li><Link to="/doprava" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Doprava</Link></li>
              <li><Link to="/kontakt" className="text-luxury-foreground/80 hover:text-gold transition-colors duration-300">Kontakt</Link></li>
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
      </motion.footer>
    </div>
  );
};
export default Footer;