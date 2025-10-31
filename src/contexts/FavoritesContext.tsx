import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

  // Load favorites from localStorage on mount
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

  // Load favorites from Shopify when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadFavoritesFromShopify()
    }
  }, [isAuthenticated])

  // Load favorites from Shopify Customer Account API
  const loadFavoritesFromShopify = async () => {
    try {
      setIsLoading(true)
      
      // Get local favorites first
      const localFavoritesStr = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const localFavorites = localFavoritesStr ? JSON.parse(localFavoritesStr) : []
      
      const response = await fetch('/api/favorites', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const shopifyFavorites = data.favorites && Array.isArray(data.favorites) ? data.favorites : []
        
        // Merge: combine shopify and local, remove duplicates
        const mergedFavorites = [...new Set([...shopifyFavorites, ...localFavorites])]
        
        // If there were local favorites that aren't in Shopify, sync them
        if (localFavorites.length > 0) {
          const toSync = localFavorites.filter(id => !shopifyFavorites.includes(id))
          if (toSync.length > 0) {
            // Sync unsynced favorites to Shopify
            for (const productId of toSync) {
              try {
                await fetch('/api/favorites', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({ productId }),
                })
              } catch (error) {
                console.error(`Error syncing favorite ${productId}:`, error)
              }
            }
            // Reload to get final merged state
            const reloadResponse = await fetch('/api/favorites', {
              method: 'GET',
              credentials: 'include',
            })
            if (reloadResponse.ok) {
              const reloadData = await reloadResponse.json()
              const finalFavorites = reloadData.favorites && Array.isArray(reloadData.favorites) ? reloadData.favorites : []
              setFavorites(finalFavorites)
              localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(finalFavorites))
            }
          } else {
            // No need to sync, just use shopify favorites
            setFavorites(shopifyFavorites)
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(shopifyFavorites))
          }
        } else {
          // No local favorites, just use shopify
          setFavorites(shopifyFavorites)
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(shopifyFavorites))
        }
      } else if (response.status === 401) {
        // Not authenticated, use localStorage
        console.log('Not authenticated, using localStorage favorites')
        if (localFavorites.length > 0) {
          setFavorites(localFavorites)
        }
      }
    } catch (error) {
      console.error('Error loading favorites from Shopify:', error)
      // On error, use localStorage favorites
      const localFavoritesStr = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const localFavorites = localFavoritesStr ? JSON.parse(localFavoritesStr) : []
      if (localFavorites.length > 0) {
        setFavorites(localFavorites)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if product is favorite
  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.includes(productId)
  }, [favorites])

  // Add product to favorites
  const addToFavorites = async (productId: string) => {
    // Optimistic update
    if (!favorites.includes(productId)) {
      const newFavorites = [...favorites, productId]
      setFavorites(newFavorites)
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites))
    }

    // Sync to Shopify if authenticated
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.favorites && Array.isArray(data.favorites)) {
            setFavorites(data.favorites)
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data.favorites))
          }
        } else if (response.status === 401) {
          // Not authenticated anymore, keep localStorage update
          console.log('Not authenticated, keeping localStorage update')
        } else {
          // Error, revert optimistic update
          throw new Error('Failed to add favorite')
        }
      } catch (error) {
        console.error('Error adding favorite to Shopify:', error)
        // Keep the localStorage update even if Shopify sync fails
      }
    }
  }

  // Remove product from favorites
  const removeFromFavorites = async (productId: string) => {
    // Optimistic update
    const newFavorites = favorites.filter(id => id !== productId)
    setFavorites(newFavorites)
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites))

    // Sync to Shopify if authenticated
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.favorites && Array.isArray(data.favorites)) {
            setFavorites(data.favorites)
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data.favorites))
          }
        } else if (response.status === 401) {
          // Not authenticated anymore, keep localStorage update
          console.log('Not authenticated, keeping localStorage update')
        } else {
          // Error, revert optimistic update
          throw new Error('Failed to remove favorite')
        }
      } catch (error) {
        console.error('Error removing favorite from Shopify:', error)
        // Keep the localStorage update even if Shopify sync fails
      }
    }
  }

  // Get favorite count
  const getFavoriteCount = useCallback(() => {
    return favorites.length
  }, [favorites])

  // Refresh favorites (reload from Shopify)
  const refreshFavorites = useCallback(async () => {
    if (isAuthenticated) {
      await loadFavoritesFromShopify()
    } else {
      // If not authenticated, just reload from localStorage
      const localFavoritesStr = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const localFavorites = localFavoritesStr ? JSON.parse(localFavoritesStr) : []
      setFavorites(localFavorites)
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

