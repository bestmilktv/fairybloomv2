import React, { createContext, useContext, useState, useEffect } from 'react';

export type CookieConsentType = 'necessary' | 'all' | null;

interface CookieConsentContextType {
  consent: CookieConsentType;
  hasConsented: boolean;
  acceptNecessary: () => void;
  acceptAll: () => void;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'fairybloom-cookie-consent';

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentType>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Načtení souhlasu z localStorage při načtení
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookieConsentType;
        setConsent(parsed);
        setShowBanner(false); // Neschovávat banner, pokud už má souhlas
      } catch (error) {
        // Pokud je uložená hodnota neplatná, zobrazit banner znovu
        setShowBanner(true);
      }
    } else {
      setShowBanner(true); // Zobrazit banner, pokud není souhlas
    }
  }, []);

  const acceptNecessary = () => {
    setConsent('necessary');
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('necessary'));
    setShowBanner(false);
  };

  const acceptAll = () => {
    setConsent('all');
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('all'));
    setShowBanner(false);
  };

  const hasConsented = consent !== null;

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        hasConsented,
        acceptNecessary,
        acceptAll,
        showBanner,
        setShowBanner,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
