import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { CartItem } from '@/types';
import { useToast } from './ToastContext';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  hasItem: (productId: string, variantId?: string | null) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCart = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Upsert cart for user
      const { data: cart } = await supabase
        .from('carts')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (!cart) return;
      setCartId(cart.id);

      const { data: cartItems } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id, name, slug, base_price, sale_price, currency, is_active, is_archived,
            images:product_images(id, url, alt_text, is_primary, sort_order),
            inventory(quantity_available, low_stock_threshold)
          ),
          variant:product_variants(id, name, sku, attributes, price_modifier)
        `)
        .eq('cart_id', cart.id)
        .order('added_at', { ascending: true });

      setItems((cartItems as CartItem[]) ?? []);
    } catch (err) {
      console.error('Cart fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCart(user.id);
    } else {
      setItems([]);
      setCartId(null);
    }
  }, [user, fetchCart]);

  const addItem = useCallback(async (
    productId: string,
    quantity = 1,
    variantId: string | null = null
  ) => {
    if (!user || !cartId) {
      toastError('Please sign in', 'You need to be logged in to add items to your cart.');
      return;
    }

    const existingItem = items.find(
      i => i.product_id === productId && i.variant_id === variantId
    );

    if (existingItem) {
      await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    const { error } = await supabase.from('cart_items').insert({
      cart_id: cartId,
      product_id: productId,
      variant_id: variantId,
      quantity,
    });

    if (error) {
      toastError('Could not add item', error.message);
      return;
    }

    await fetchCart(user.id);
  }, [user, cartId, items, fetchCart, toastError]);

  const removeItem = useCallback(async (cartItemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) { toastError('Could not remove item', error.message); return; }
    setItems(prev => prev.filter(i => i.id !== cartItemId));
  }, [toastError]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(cartItemId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId);

    if (error) { toastError('Could not update quantity', error.message); return; }
    setItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity } : i));
  }, [removeItem, toastError]);

  const clearCart = useCallback(async () => {
    if (!cartId) return;
    await supabase.from('cart_items').delete().eq('cart_id', cartId);
    setItems([]);
  }, [cartId]);

  const hasItem = useCallback((productId: string, variantId: string | null = null): boolean => {
    return items.some(i => i.product_id === productId && i.variant_id === variantId);
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      isLoading,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      hasItem,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
