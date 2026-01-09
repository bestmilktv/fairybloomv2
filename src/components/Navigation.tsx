import { useState, useEffect, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart, User, UserCheck, LogOut, Settings, Heart, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal';
import { MiniCart } from '@/components/MiniCart';
import { FavoritesSidebar } from '@/components/FavoritesSidebar';
import logo from '@/assets/logo.png';

// OPTIMALIZACE: Statická data mimo komponentu - nevytváří se při každém renderu
const CATEGORIES = [
  { name: 'Náhrdelníky', path: '/nahrdelniky' },
  { name: 'Náušnice', path: '/nausnice' },
  { name: 'Prsteny', path: '/prsteny' },
  { name: 'Náramky', path: '/naramky' }
];

// OPTIMALIZACE: Memoizovaná komponenta - re-renderuje se jen při změně props/state
const Navigation = memo(() => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [favoritesSidebarOpen, setFavoritesSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout, isAuthenticated, needsProfileCompletion, setNeedsProfileCompletion } = useAuth();
  const { getTotalItems } = useCart();
  const { getFavoriteCount } = useFavorites();

  // OPTIMALIZACE: Throttled scroll handler pomocí requestAnimationFrame
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // passive: true pro lepší scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // OPTIMALIZACE: Memoizovaný callback
  const handleSignOut = useCallback(() => {
    try {
      logout();
    } catch (error) {
      console.error('Navigation: Sign out error:', error);
    }
  }, [logout]);

  // OPTIMALIZACE: Memoizované callbacky pro otevírání modalů
  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const openMiniCart = useCallback(() => setMiniCartOpen(true), []);
  const closeMiniCart = useCallback(() => setMiniCartOpen(false), []);
  const openFavorites = useCallback(() => setFavoritesSidebarOpen(true), []);
  const closeFavorites = useCallback(() => setFavoritesSidebarOpen(false), []);
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const completeProfile = useCallback(() => setNeedsProfileCompletion(false), [setNeedsProfileCompletion]);

  const handleLogoClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCategoryClick = useCallback(() => {
    closeMobileMenu();
  }, [closeMobileMenu]);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-effect shadow-lg' : 'bg-transparent'}`}
      role="navigation"
      aria-label="Hlavní navigace"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo - změněno h1 na span pro správnou heading strukturu */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity duration-300 flex-shrink-0 min-w-0" 
            onClick={handleLogoClick}
            aria-label="Fairy Bloom - domovská stránka"
          >
            <img 
              src={logo} 
              alt="" 
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain flex-shrink-0"
              width={48}
              height={48}
              aria-hidden="true"
            />
            <span className="text-base sm:text-xl md:text-2xl lg:text-3xl font-light text-primary tracking-[0.15em] sm:tracking-[0.2em] font-serif whitespace-nowrap overflow-hidden text-ellipsis">
              FAIRY BLOOM
            </span>
          </Link>

          {/* Category Navigation */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {CATEGORIES.map(category => (
              <Link 
                key={category.path} 
                to={category.path} 
                className="text-primary/80 hover:text-primary px-3 py-1.5 rounded-full tracking-wide smooth-font-weight hover:bg-background/80 hover:scale-105 hover:shadow-md hover:shadow-primary/5 inline-block min-w-fit"
              >
                {category.name}
              </Link>
            ))}
          </div>

          {/* Account, Favorites & Cart & Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
            {isAuthenticated && user ? (
              <div className={profileDropdownOpen ? '' : 'group'}>
                <DropdownMenu open={profileDropdownOpen} onOpenChange={setProfileDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 rounded-full focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 ${!profileDropdownOpen ? 'hover:!scale-110 transition-transform duration-300' : '!scale-100 !transition-none'}`}
                      aria-label="Uživatelský účet"
                    >
                      <UserCheck className={`h-4 w-4 sm:h-5 sm:w-5 ${!profileDropdownOpen ? 'transition-transform duration-300 group-hover:scale-110' : 'transition-none'}`} />
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
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 h-9 w-9 sm:h-10 sm:w-10 rounded-full"
                onClick={openAuthModal}
                aria-label="Přihlášení"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 rounded-full group flex items-center justify-center"
              style={{ 
                transformOrigin: 'center center'
              }}
              onClick={openFavorites}
              aria-label={`Oblíbené${getFavoriteCount() > 0 ? ` (${getFavoriteCount()})` : ''}`}
            >
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110 group-hover:fill-primary/20" style={{ transform: 'translateZ(0)', transformOrigin: 'center center' }} />
              {getFavoriteCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md" style={{ transform: 'translateZ(0)', transformOrigin: 'center center' }} aria-hidden="true">
                  {getFavoriteCount()}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="!text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 relative h-9 w-9 sm:h-10 sm:w-10 rounded-full group flex items-center justify-center"
              style={{ 
                transformOrigin: 'center center'
              }}
              onClick={openMiniCart}
              data-cart-icon
              aria-label={`Košík${getTotalItems() > 0 ? ` (${getTotalItems()})` : ''}`}
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" style={{ transform: 'translateZ(0)', transformOrigin: 'center center' }} />
              {getTotalItems() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md" style={{ transform: 'translateZ(0)', transformOrigin: 'center center' }} aria-hidden="true">
                  {getTotalItems()}
                </span>
              )}
            </Button>
            
            {/* Mobile Menu Button - shown only on mobile/tablet, positioned at the end */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden !text-primary/80 hover:!text-primary hover:!bg-background/80 hover:!scale-110 hover:!shadow-lg hover:!shadow-primary/10 h-9 w-9 sm:h-10 sm:w-10 rounded-full"
                  aria-label="Otevřít menu"
                >
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur-xl">
                <SheetHeader>
                  <SheetTitle className="text-left text-2xl font-light text-primary tracking-wide">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col space-y-3" aria-label="Navigace kategorií">
                  {CATEGORIES.map((category, index) => (
                    <Link
                      key={category.path}
                      to={category.path}
                      onClick={handleCategoryClick}
                      className="text-primary/70 hover:text-primary px-5 py-3.5 rounded-xl tracking-wide smooth-font-weight hover:bg-primary/5 transition-all duration-300 text-lg font-light opacity-0"
                      style={{ 
                        animation: `menuItemReveal 0.9s cubic-bezier(0.2, 0, 0, 1) forwards`,
                        animationDelay: `${index * 120 + 200}ms`
                      }}
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={closeAuthModal} 
      />
      
      <CompleteProfileModal
        isOpen={needsProfileCompletion}
        onComplete={completeProfile}
      />
      
      <MiniCart 
        isOpen={miniCartOpen}
        onClose={closeMiniCart}
      />
      
      <FavoritesSidebar 
        isOpen={favoritesSidebarOpen}
        onClose={closeFavorites}
      />
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;
