import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { createCart, addToCart as addToShopifyCart, getCart, updateCartLines, removeCartLines } from '@/lib/shopify'

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
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Convert Shopify cart to local cart items
  // OPTIMALIZACE: Přesunuto před useEffect, který to používá
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
  // OPTIMALIZACE: Přesunuto před useEffect, který to používá
  const refreshCartFromShopify = useCallback(async (cartIdToFetch: string) => {
    try {
      setIsLoading(true)
      const shopifyCart = await getCart(cartIdToFetch)
      if (shopifyCart) {
        const cartItems = convertShopifyCartToItems(shopifyCart)
        setItems(cartItems)
        
        // If cart is empty after refresh, clear checkout URL
        if (cartItems.length === 0) {
          sessionStorage.removeItem('fairybloom-checkout-url')
        }
      }
    } catch (error) {
      console.error('Error fetching cart from Shopify:', error)
      // If cart doesn't exist, clear the cart ID and localStorage
      setCartId(null)
      setItems([])
      localStorage.removeItem('fairybloom-cart-id')
      sessionStorage.removeItem('fairybloom-checkout-url')
      
      // Show user-friendly error message
      console.warn('Cart not found or expired. Creating new cart on next add to cart action.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load cart ID from localStorage on mount
  useEffect(() => {
    const savedCartId = localStorage.getItem('fairybloom-cart-id')
    if (savedCartId) {
      setCartId(savedCartId)
      // Fetch cart from Shopify
      refreshCartFromShopify(savedCartId)
    }
  }, [refreshCartFromShopify])

  // Save cart ID to localStorage whenever it changes
  useEffect(() => {
    if (cartId) {
      localStorage.setItem('fairybloom-cart-id', cartId)
    } else {
      localStorage.removeItem('fairybloom-cart-id')
    }
  }, [cartId])

  // Refresh cart from Shopify
  const refreshCart = useCallback(async () => {
    if (cartId) {
      await refreshCartFromShopify(cartId)
    }
  }, [cartId, refreshCartFromShopify])

  const addToCart = useCallback(async (newItem: Omit<CartItem, 'quantity'>) => {
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
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cartId, refreshCartFromShopify])

  const removeFromCart = useCallback(async (id: string) => {
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
      
      // Check if cart will be empty after removal
      const updatedItems = items.filter(i => i.id !== id)
      
      // Refresh cart from Shopify
      await refreshCartFromShopify(cartId)
      
      // If cart is now empty, clear checkout URL
      if (updatedItems.length === 0) {
        sessionStorage.removeItem('fairybloom-checkout-url')
      }
    } catch (error) {
      console.error('Error removing from cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [items, cartId, refreshCartFromShopify])

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    try {
      setIsLoading(true)
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const itemToRemove = items.find(item => item.id === id)
        if (!itemToRemove?.lineId || !cartId) {
          throw new Error('Item or cart not found')
        }
        const removeResult = await removeCartLines(cartId, [itemToRemove.lineId])
        if (removeResult.data.cartLinesRemove.userErrors.length > 0) {
          throw new Error(removeResult.data.cartLinesRemove.userErrors[0].message)
        }
        await refreshCartFromShopify(cartId)
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
    } catch (error) {
      console.error('Error updating quantity:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [items, cartId, refreshCartFromShopify])

  const clearCart = useCallback(async () => {
    try {
      setIsLoading(true)
      
      if (!cartId) {
        setItems([])
        // Clear checkout URL if cart is already empty
        sessionStorage.removeItem('fairybloom-checkout-url')
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
      
      // Clear checkout URL when cart is cleared
      sessionStorage.removeItem('fairybloom-checkout-url')
    } catch (error) {
      console.error('Error clearing cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [items, cartId])

  // Memoizované funkce pro výpočty
  const getTotalPrice = useMemo(() => {
    return () => items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [items])

  const getTotalItems = useMemo(() => {
    return () => items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  // Memoizovaný context value - zabraňuje zbytečným re-renderům
  const value = useMemo(() => ({
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
  }), [items, cartId, isLoading, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems, refreshCart])

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