import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

/**
 * Hook pro zablokování scrollu na body když je modal/sidebar otevřený
 * Používá se pro lepší UX na mobilech - zabraňuje scrollování pozadí
 * Na PC zůstává scrollování pozadí povoleno
 */
export function useLockBodyScroll(isLocked: boolean) {
  const isMobile = useIsMobile();

  useEffect(() => {
    // Blokujeme scroll pouze na mobilech
    if (isLocked && isMobile) {
      // Uložíme aktuální scroll pozici
      const scrollY = window.scrollY;
      
      // Zablokujeme scroll na body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Uložíme scroll pozici do data atributu pro pozdější obnovení
      document.body.setAttribute('data-scroll-y', scrollY.toString());
      
      return () => {
        // Obnovíme scroll pozici při odemčení
        const savedScrollY = document.body.getAttribute('data-scroll-y');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        if (savedScrollY) {
          window.scrollTo(0, parseInt(savedScrollY, 10));
        }
      };
    }
  }, [isLocked, isMobile]);
}
