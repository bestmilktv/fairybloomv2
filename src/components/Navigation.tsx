import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShoppingCart, User, UserCheck, LogOut, Settings, Heart } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity duration-300 flex-shrink-0 min-w-0" onClick={() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}>
            <img src={logo} alt="Fairy Bloom Logo" className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain flex-shrink-0" />
            <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-light text-primary tracking-[0.15em] sm:tracking-[0.2em] font-serif whitespace-nowrap overflow-hidden text-ellipsis">FAIRY BLOOM</h1>
          </Link>

          {/* Category Navigation */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {categories.map(category => <Link 
              key={category.path} 
              to={category.path} 
              className="text-primary/80 hover:text-primary px-3 py-1.5 rounded-full tracking-wide smooth-font-weight hover:bg-background/80 hover:scale-105 hover:shadow-md hover:shadow-primary/5"
            >
              {category.name}
            </Link>)}
          </div>

          {/* Account, Favorites & Cart */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 transition-all duration-300 rounded-full smooth-font-weight">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-background/95 backdrop-blur-xl border-border shadow-xl mt-2"
                  sideOffset={8}
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-primary">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-primary/60">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild>
                    <Link to="/muj-profil" className="flex items-center text-primary/80 hover:bg-background/70 hover:text-primary focus:bg-background/70 focus:text-primary transition-all duration-200 rounded-md px-2 py-1.5 group/item">
                      <Settings className="mr-2 h-4 w-4 transition-transform duration-200 group-hover/item:rotate-12" />
                      Můj profil
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-border" />
                   <DropdownMenuItem 
                     onClick={handleSignOut}
                     className="flex items-center text-primary/80 hover:bg-red-50/50 hover:text-red-600 focus:bg-red-50/50 focus:text-red-600 cursor-pointer transition-all duration-200 rounded-md px-2 py-1.5 group/item"
                   >
                     <LogOut className="mr-2 h-4 w-4 transition-transform duration-200 group-hover/item:translate-x-1" />
                     Odhlásit se
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 h-9 w-9 sm:h-10 sm:w-10 transition-all duration-300 rounded-full smooth-font-weight"
                onClick={() => setAuthModalOpen(true)}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 transition-all duration-300 rounded-full group smooth-font-weight"
              onClick={() => setFavoritesSidebarOpen(true)}
            >
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110 group-hover:fill-primary/20" />
              {getFavoriteCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                  {getFavoriteCount()}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 transition-all duration-300 rounded-full group smooth-font-weight"
              onClick={() => setMiniCartOpen(true)}
              data-cart-icon
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
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