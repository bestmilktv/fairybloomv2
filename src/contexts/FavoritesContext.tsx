import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

interface FavoritesContextType {
  favorites: string[] // Array of product IDs
  isLoading: boolean
  isFavorite: (productId: string) => boolean
  addToFavorites: (productId: string) => Promise<void>
  removeFromFavorites: (productId: string) => Promise<void>
  getFavoriteCount: () => number
  refreshFavorites: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const FAVORITES_STORAGE_KEY = 'fairybloom-favorites'

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Ref aby se sync nespouštěl dvakrát
  const isSyncingRef = useRef(false);

  // 1. Load favorites from localStorage on initial mount
  useEffect(() => {
    const loadLocalFavorites = () => {
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setFavorites(parsed)
          }
        }
      } catch (error) {
        console.error('Error loading favorites from localStorage:', error)
      }
    }

    loadLocalFavorites()
  }, [])

  // 2. Sync & Load Logic when Auth changes
  useEffect(() => {
    const syncAndLoad = async () => {
      if (isAuthenticated) {
        await syncLocalToShopify();
      }
    };
    syncAndLoad();
  }, [isAuthenticated]);

  // MAIN SYNC FUNCTION
  const syncLocalToShopify = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsLoading(true);

    try {
      // A) Načteme lokální (Guest) oblíbené
      const localStr = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const localFavorites: string[] = localStr ? JSON.parse(localStr) : [];

      // B) Načteme vzdálené (Shopify) oblíbené
      const response = await fetch('/api/favorites', { method: 'GET' });
      let shopifyFavorites: string[] = [];
      
      if (response.ok) {
        const data = await response.json();
        shopifyFavorites = data.favorites || [];
      }

      // C) Zjistíme rozdíl: Co mám lokálně, ale v Shopify to chybí?
      const missingInShopify = localFavorites.filter(id => !shopifyFavorites.includes(id));

      // D) Pokud něco chybí, pošleme to do Shopify (Sériově, aby nedošlo k race condition na backendu)
      if (missingInShopify.length > 0) {
        console.log('[Favorites] Syncing local items to cloud:', missingInShopify);
        
        for (const productId of missingInShopify) {
          try {
            await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId }),
            });
          } catch (err) {
            console.error(`Failed to sync item ${productId}`, err);
          }
        }
        
        // Po odeslání všeho si stáhneme finální stav (pro jistotu)
        const finalResponse = await fetch('/api/favorites', { method: 'GET' });
        if (finalResponse.ok) {
            const finalData = await finalResponse.json();
            shopifyFavorites = finalData.favorites || [];
        }
      }

      // E) Sloučíme vše dohromady (Remote má teď přednost, protože obsahuje i to co jsme tam právě poslali)
      // Ale pro jistotu uděláme Union (sjednocení), kdyby něco selhalo.
      const mergedFavorites = Array.from(new Set([...localFavorites, ...shopifyFavorites]));

      setFavorites(mergedFavorites);
      
      // Uložíme sjednocený stav i do localStorage (jako cache)
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(mergedFavorites));

    } catch (error) {
      console.error('Error syncing favorites:', error);
    } finally {
      setIsLoading(false);
      isSyncingRef.current = false;
    }
  };

  // --- ACTIONS ---

  const addToFavorites = async (productId: string) => {
    // 1. Optimistic Update (hned zobrazíme srdíčko)
    const newFavorites = [...new Set([...favorites, productId])];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));

    // 2. Sync to API (if logged in)
    if (isAuthenticated) {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      } catch (error) {
        console.error('Error adding to cloud favorites:', error);
        // Poznámka: Ne revertujeme optimistic update, protože lokálně to uživatel chce mít
      }
    }
  }

  const removeFromFavorites = async (productId: string) => {
    // 1. Optimistic Update
    const newFavorites = favorites.filter(id => id !== productId);
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));

    // 2. Sync to API (if logged in)
    if (isAuthenticated) {
      try {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      } catch (error) {
        console.error('Error removing from cloud favorites:', error);
      }
    }
  }

  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.includes(productId)
  }, [favorites])

  const getFavoriteCount = useCallback(() => {
    return favorites.length
  }, [favorites])

  const refreshFavorites = useCallback(async () => {
    if (isAuthenticated) {
      await syncLocalToShopify();
    } else {
      const localStr = localStorage.getItem(FAVORITES_STORAGE_KEY)
      if (localStr) setFavorites(JSON.parse(localStr))
    }
  }, [isAuthenticated])

  const value: FavoritesContextType = {
    favorites,
    isLoading,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    getFavoriteCount,
    refreshFavorites,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}