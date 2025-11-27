import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackToHomepageButton = () => (
  <Link 
    to="/" 
    className="inline-flex items-center px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors duration-200 text-sm font-medium text-foreground hover:text-luxury"
  >
    <ArrowLeft className="h-4 w-4 mr-2" />
    Zpět na hlavní stránku
  </Link>
);

export default BackToHomepageButton;

















