import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function CookieConsent() {
  const { showBanner, acceptNecessary, acceptAll, setShowBanner } = useCookieConsent();

  // Zavření při kliknutí na X
  const handleClose = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Používáme cookies</h3>
            <p className="text-sm text-muted-foreground">
              Tato stránka používá cookies pro zajištění správného fungování webu a zlepšení vaší zkušenosti. 
              Některé cookies jsou nezbytné pro fungování stránky, jiné nám pomáhají analyzovat návštěvnost 
              a přizpůsobit obsah vašim preferencím.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Více informací najdete v našich{' '}
              <a href="/o-nas" className="underline hover:text-foreground">
                podmínkách použití
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={acceptNecessary}
              className="whitespace-nowrap"
            >
              Pouze nezbytné
            </Button>
            <Button
              onClick={acceptAll}
              className="whitespace-nowrap"
            >
              Přijmout vše
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleClose}
              aria-label="Zavřít"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
