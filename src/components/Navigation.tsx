import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShoppingCart, User, UserCheck, LogOut, Package, Settings, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal';
import { MiniCart } from '@/components/MiniCart';
import { FavoritesSidebar } from '@/components/FavoritesSidebar';
import { createCollectionPath } from '@/lib/slugify';
import logo from '@/assets/logo.png';
const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [favoritesSidebarOpen, setFavoritesSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated, needsProfileCompletion, setNeedsProfileCompletion } = useAuth();
  const { getTotalItems } = useCart();
  const { getFavoriteCount } = useFavorites();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const categories = [{
    name: 'Náhrdelníky',
    path: createCollectionPath('Náhrdelníky')
  }, {
    name: 'Náušnice',
    path: createCollectionPath('Náušnice')
  }, {
    name: 'Prsteny',
    path: createCollectionPath('Prsteny')
  }, {
    name: 'Náramky',
    path: createCollectionPath('Náramky')
  }];

  const handleSignOut = () => {
    console.log('Navigation: handleSignOut called');
    try {
      logout();
      console.log('Navigation: Sign out successful');
    } catch (error) {
      console.error('Navigation: Unexpected sign out error:', error);
    }
  };
  return <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-effect shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-300" onClick={() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}>
            <img src={logo} alt="Fairy Bloom Logo" className="h-12 w-12 object-contain" />
            <h1 className="text-3xl font-light text-luxury tracking-[0.2em] font-serif">FAIRY BLOOM</h1>
          </Link>

          {/* Category Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {categories.map(category => <Link key={category.path} to={category.path} className="text-foreground/80 hover:text-gold transition-colors duration-300 font-medium tracking-wide">
                {category.name}
              </Link>)}
          </div>

          {/* Account, Favorites & Cart */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gold hover:text-gold/80 relative">
                    <UserCheck className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-background/95 backdrop-blur-xl border-gold/20 shadow-xl mt-2"
                  sideOffset={8}
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-luxury">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-foreground/60">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-gold/20" />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center text-foreground/80 hover:bg-gold/10 hover:text-gold focus:bg-gold/10 focus:text-gold">
                      <Settings className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center text-foreground/80 hover:bg-gold/10 hover:text-gold focus:bg-gold/10 focus:text-gold">
                      <Package className="mr-2 h-4 w-4" />
                      Mé objednávky
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-gold/20" />
                   <DropdownMenuItem 
                     onClick={handleSignOut}
                     className="flex items-center text-foreground/80 hover:bg-gold/10 hover:text-gold focus:bg-gold/10 focus:text-gold cursor-pointer"
                   >
                     <LogOut className="mr-2 h-4 w-4" />
                     Odhlásit se
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-foreground/80 hover:text-gold"
                onClick={() => setAuthModalOpen(true)}
              >
                <User className="h-5 w-5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-foreground/80 hover:text-gold relative"
              onClick={() => setFavoritesSidebarOpen(true)}
            >
              <Heart className="h-5 w-5" />
              {getFavoriteCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {getFavoriteCount()}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-foreground/80 hover:text-gold relative"
              onClick={() => setMiniCartOpen(true)}
              data-cart-icon
            >
              <ShoppingCart className="h-5 w-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {getTotalItems()}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
      
      <CompleteProfileModal
        isOpen={needsProfileCompletion}
        onComplete={() => setNeedsProfileCompletion(false)}
      />
      
      <MiniCart 
        isOpen={miniCartOpen}
        onClose={() => setMiniCartOpen(false)}
      />
      
      <FavoritesSidebar 
        isOpen={favoritesSidebarOpen}
        onClose={() => setFavoritesSidebarOpen(false)}
      />
    </nav>;
};
export default Navigation;