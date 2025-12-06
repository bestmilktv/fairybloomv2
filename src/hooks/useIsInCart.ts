import { useMemo } from 'react';
import { useCart } from '@/contexts/CartContext';

/**
 * Optimalizovaný hook pro kontrolu, zda je produkt v košíku
 * Používá useMemo pro minimalizaci re-renderů
 */
export const useIsInCart = (productId: string): boolean => {
  const { items } = useCart();
  
  return useMemo(() => {
    return items.some(item => item.id === productId);
  }, [items, productId]);
};

