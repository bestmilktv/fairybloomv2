import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { createCart, addToCart as addToShopifyCart, getCart, updateCartLines, removeCartLines } from '@/lib/shopify'
import { useAuth } from './AuthContext'

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  category: string
  variantId?: string // Shopify variant ID for checkout
  isShopifyProduct?: boolean // Flag to identify Shopify products
  lineId?: string // Shopify cart line ID for updates
}

interface CartContextType {
  items: CartItem[]
  cartId: string | null
  isLoading: boolean
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  removeFromCart: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getTotalPrice: () => number
  getTotalItems: () => number
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Ref aby se sync nespouštěl dvakrát
  const isSyncingRef = useRef(false)

  // Load cart ID from localStorage on mount (for guest users)
  useEffect(() => {
    if (!isAuthenticated) {
      const savedCartId = localStorage.getItem('fairybloom-cart-id')
      if (savedCartId) {
        setCartId(savedCartId)
        // Fetch cart from Shopify
        refreshCartFromShopify(savedCartId)
      }
    }
  }, [])

  // Save cart ID to localStorage whenever it changes (for guest users)
  useEffect(() => {
    if (cartId && !isAuthenticated) {
      localStorage.setItem('fairybloom-cart-id', cartId)
    } else if (!cartId) {
      localStorage.removeItem('fairybloom-cart-id')
    }
  }, [cartId, isAuthenticated])

  // Sync cart with Shopify when user logs in
  useEffect(() => {
    const syncCart = async () => {
      if (isAuthenticated) {
        await syncLocalCartToShopify()
      }
    }
    syncCart()
  }, [isAuthenticated])

  // Convert Shopify cart to local cart items
  const convertShopifyCartToItems = (shopifyCart: any): CartItem[] => {
    if (!shopifyCart?.lines?.edges) return []
    
    return shopifyCart.lines.edges.map((edge: any) => {
      const line = edge.node
      const variant = line.merchandise
      const product = variant.product
      const image = product.images?.edges?.[0]?.node?.url || ''
      
      return {
        id: product.id,
        name: product.title,
        price: parseFloat(variant.price.amount),
        image: image,
        quantity: line.quantity,
        category: 'Shopify Product', // You might want to get this from product tags
        variantId: variant.id,
        isShopifyProduct: true,
        lineId: line.id
      }
    })
  }

  // Fetch cart from Shopify
  const refreshCartFromShopify = async (cartIdToFetch: string) => {
    try {
      setIsLoading(true)
      const shopifyCart = await getCart(cartIdToFetch)
      if (shopifyCart) {
        const cartItems = convertShopifyCartToItems(shopifyCart)
        setItems(cartItems)
      }
    } catch (error) {
      console.error('Error fetching cart from Shopify:', error)
      // If cart doesn't exist, clear the cart ID and localStorage
      setCartId(null)
      setItems([])
      localStorage.removeItem('fairybloom-cart-id')
      
      // Show user-friendly error message
      console.warn('Cart not found or expired. Creating new cart on next add to cart action.')
    } finally {
      setIsLoading(false)
    }
  }

  // MAIN SYNC FUNCTION - Merge local cart with Shopify cart
  const syncLocalCartToShopify = async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsLoading(true)

    try {
      // A) Načteme lokální (Guest) košík
      const localCartId = localStorage.getItem('fairybloom-cart-id')
      let localCartItems: CartItem[] = []
      
      if (localCartId) {
        try {
          const localCart = await getCart(localCartId)
          if (localCart) {
            localCartItems = convertShopifyCartToItems(localCart)
          }
        } catch (error) {
          console.warn('[Cart] Local cart not found or expired:', error)
          // Local cart expired, continue without it
        }
      }

      // B) Načteme vzdálený (Shopify) cartId z metafieldu
      const response = await fetch('/api/cart', { method: 'GET', credentials: 'include' })
      
      // Handle 401 - user is not authenticated, skip sync
      if (response.status === 401) {
        console.warn('[Cart] User not authenticated (401), skipping sync')
        return // Exit early, don't try to sync
      }
      
      let shopifyCartId: string | null = null
      
      if (response.ok) {
        const data = await response.json()
        shopifyCartId = data.cartId || null
      }

      let shopifyCartItems: CartItem[] = []
      let finalCartId: string | null = null

      // C) Pokud existuje Shopify košík, načteme ho
      if (shopifyCartId) {
        try {
          const shopifyCart = await getCart(shopifyCartId)
          if (shopifyCart) {
            shopifyCartItems = convertShopifyCartToItems(shopifyCart)
            finalCartId = shopifyCartId
          }
        } catch (error) {
          console.warn('[Cart] Shopify cart not found or expired:', error)
          // Shopify cart expired, continue without it
        }
      }

      // D) Sloučíme košíky - přidáme lokální položky do Shopify košíku
      if (localCartItems.length > 0) {
        // Pokud nemáme Shopify košík, vytvoříme nový z první lokální položky
        if (!finalCartId && localCartItems.length > 0 && localCartItems[0].variantId) {
          try {
            const result = await createCart(localCartItems[0].variantId, localCartItems[0].quantity)
            if (result.data.cartCreate.userErrors.length === 0) {
              finalCartId = result.data.cartCreate.cart.id
              shopifyCartItems = convertShopifyCartToItems(result.data.cartCreate.cart)
            }
          } catch (error) {
            console.error('[Cart] Error creating new cart:', error)
          }
        }

        // Přidáme všechny lokální položky do Shopify košíku (pokud tam ještě nejsou)
        if (finalCartId) {
          for (const localItem of localCartItems) {
            if (!localItem.variantId) continue

            // Zkontrolujeme, jestli už není v Shopify košíku
            const existsInShopify = shopifyCartItems.some(
              item => item.variantId === localItem.variantId
            )

            if (!existsInShopify) {
              try {
                await addToShopifyCart(finalCartId, localItem.variantId, localItem.quantity)
                console.log('[Cart] Synced local item to Shopify:', localItem.name)
              } catch (error) {
                console.error(`[Cart] Failed to sync item ${localItem.name}:`, error)
              }
            }
          }

          // Načteme finální stav košíku z Shopify
          try {
            const finalCart = await getCart(finalCartId)
            if (finalCart) {
              shopifyCartItems = convertShopifyCartToItems(finalCart)
            }
          } catch (error) {
            console.error('[Cart] Error fetching final cart:', error)
          }
        }
      }

      // E) Nastavíme finální stav
      if (finalCartId) {
        setCartId(finalCartId)
        setItems(shopifyCartItems)
        
        // Uložíme cartId do metafieldu
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartId: finalCartId }),
          })
        } catch (error) {
          console.error('[Cart] Error saving cartId to metafield:', error)
        }
      } else if (localCartItems.length > 0) {
        // Pokud máme jen lokální košík, použijeme ho
        setItems(localCartItems)
        if (localCartId) {
          setCartId(localCartId)
        }
      } else {
        // Žádný košík
        setItems([])
        setCartId(null)
      }

    } catch (error) {
      console.error('[Cart] Error syncing cart:', error)
    } finally {
      setIsLoading(false)
      isSyncingRef.current = false
    }
  }

  // Refresh cart from Shopify
  const refreshCart = async () => {
    if (cartId) {
      await refreshCartFromShopify(cartId)
    }
  }

  const addToCart = async (newItem: Omit<CartItem, 'quantity'>) => {
    try {
      setIsLoading(true)
      console.log('Adding to cart:', newItem) // DEBUG
      
      if (!newItem.variantId) {
        throw new Error('Variant ID is required for Shopify products')
      }

      if (cartId) {
        console.log('Adding to existing cart:', cartId) // DEBUG
        // Add to existing cart
        const result = await addToShopifyCart(cartId, newItem.variantId, 1)
        console.log('Add to cart result:', result) // DEBUG
        if (result.data.cartLinesAdd.userErrors.length > 0) {
          throw new Error(result.data.cartLinesAdd.userErrors[0].message)
        }
        // Refresh cart from Shopify
        await refreshCartFromShopify(cartId)
      } else {
        console.log('Creating new cart with variant:', newItem.variantId) // DEBUG
        // Create new cart
        const result = await createCart(newItem.variantId, 1)
        console.log('Create cart result:', result) // DEBUG
        if (result.data.cartCreate.userErrors.length > 0) {
          throw new Error(result.data.cartCreate.userErrors[0].message)
        }
        const newCartId = result.data.cartCreate.cart.id
        console.log('New cart ID:', newCartId) // DEBUG
        setCartId(newCartId)
        // Refresh cart from Shopify
        await refreshCartFromShopify(newCartId)
        
        // Save cartId to metafield if authenticated
        if (isAuthenticated) {
          try {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ cartId: newCartId }),
            })
          } catch (error) {
            console.error('[Cart] Error saving cartId to metafield:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (id: string) => {
    try {
      setIsLoading(true)
      
      const item = items.find(item => item.id === id)
      if (!item?.lineId || !cartId) {
        throw new Error('Item or cart not found')
      }

      const result = await removeCartLines(cartId, [item.lineId])
      if (result.data.cartLinesRemove.userErrors.length > 0) {
        throw new Error(result.data.cartLinesRemove.userErrors[0].message)
      }
      
      // Refresh cart from Shopify
      await refreshCartFromShopify(cartId)
      
      // Update metafield if authenticated
      if (isAuthenticated && cartId) {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartId }),
          })
        } catch (error) {
          console.error('[Cart] Error updating cartId in metafield:', error)
        }
      }
    } catch (error) {
      console.error('Error removing from cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (id: string, quantity: number) => {
    try {
      setIsLoading(true)
      
      if (quantity <= 0) {
        await removeFromCart(id)
        return
      }

      const item = items.find(item => item.id === id)
      if (!item?.lineId || !cartId) {
        throw new Error('Item or cart not found')
      }

      const result = await updateCartLines(cartId, [{ id: item.lineId, quantity }])
      if (result.data.cartLinesUpdate.userErrors.length > 0) {
        throw new Error(result.data.cartLinesUpdate.userErrors[0].message)
      }
      
      // Refresh cart from Shopify
      await refreshCartFromShopify(cartId)
      
      // Update metafield if authenticated
      if (isAuthenticated && cartId) {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartId }),
          })
        } catch (error) {
          console.error('[Cart] Error updating cartId in metafield:', error)
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = async () => {
    try {
      setIsLoading(true)
      
      if (!cartId) {
        setItems([])
        return
      }

      const lineIds = items.map(item => item.lineId).filter(Boolean) as string[]
      if (lineIds.length > 0) {
        const result = await removeCartLines(cartId, lineIds)
        if (result.data.cartLinesRemove.userErrors.length > 0) {
          throw new Error(result.data.cartLinesRemove.userErrors[0].message)
        }
      }
      
      // Clear cart ID and items
      setCartId(null)
      setItems([])
      
      // Clear metafield if authenticated (send empty string to clear)
      if (isAuthenticated) {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartId: '' }),
          })
        } catch (error) {
          console.error('[Cart] Error clearing cartId in metafield:', error)
        }
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const value = {
    items,
    cartId,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    refreshCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}