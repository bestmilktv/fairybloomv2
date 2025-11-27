import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackToHomepageButton = () => (
  <Link 
    to="/" 
    className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium text-gray-700 hover:text-gray-900"
  >
    <ArrowLeft className="h-4 w-4 mr-2" />
    Zpět na hlavní stránku
  </Link>
);

export default BackToHomepageButton;

















