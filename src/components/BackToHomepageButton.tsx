import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackToHomepageButton = () => (
  <Link 
    to="/" 
    className="inline-flex items-center px-4 py-2 bg-primary/80 hover:bg-primary/90 rounded-lg transition-all duration-200 text-sm font-medium text-primary-foreground hover:shadow-md hover:shadow-primary/10"
  >
    <ArrowLeft className="h-4 w-4 mr-2" />
    Zpět na hlavní stránku
  </Link>
);

export default BackToHomepageButton;

















