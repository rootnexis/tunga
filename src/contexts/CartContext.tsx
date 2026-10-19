import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { CartItem, Product } from '@/types';
import { useToast } from './ToastContext';
import { MOCK_PRODUCTS } from '@/lib/mockData';

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

const GUEST_CART_STORAGE_KEY = 'ituza_guest_cart';

function getStoredGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredGuestCart(items: CartItem[]): void {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [items, setItems] = useState<CartItem[]>(() => (!user ? getStoredGuestCart() : []));
  const [cartId, setCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;

  const fetchCart = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Upsert cart for user
      const { data: cart } = await supabase
        .from('carts')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (!cart) {
        setIsLoading(false);
        return;
      }
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

      const fetched = (cartItems as CartItem[]) ?? [];

      // Check if we have guest items to merge
      const guestItems = getStoredGuestCart();
      if (guestItems.length > 0) {
        for (const gItem of guestItems) {
          const match = fetched.find(
            (f) => f.product_id === gItem.product_id && f.variant_id === gItem.variant_id
          );
          if (match) {
            await supabase
              .from('cart_items')
              .update({ quantity: match.quantity + gItem.quantity })
              .eq('id', match.id);
          } else {
            await supabase.from('cart_items').insert({
              cart_id: cart.id,
              product_id: gItem.product_id,
              variant_id: gItem.variant_id || null,
              quantity: gItem.quantity,
            });
          }
        }
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);

        // Re-fetch merged items
        const { data: merged } = await supabase
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

        setItems((merged as CartItem[]) ?? []);
      } else {
        setItems(fetched);
      }
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
      setCartId(null);
      setItems(getStoredGuestCart());
    }
  }, [user, fetchCart]);

  const addItem = useCallback(async (
    productId: string,
    quantity = 1,
    variantId: string | null = null
  ) => {
    // If authenticated and cartId is established:
    if (userRef.current && cartId) {
      const existingItem = items.find(
        (i) => i.product_id === productId && i.variant_id === variantId
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

      await fetchCart(userRef.current.id);
      return;
    }

    // Otherwise, handle as Guest cart in local storage:
    try {
      let productData: Product | undefined;
      // Try to find product from supabase or MOCK_PRODUCTS
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, sale_price, currency, is_active, is_archived,
          images:product_images(id, url, alt_text, is_primary, sort_order),
          inventory(quantity_available, low_stock_threshold),
          category:categories(id, name, slug)
        `)
        .eq('id', productId)
        .maybeSingle();

      if (data) {
        productData = data as unknown as Product;
      } else {
        productData = MOCK_PRODUCTS.find((p) => p.id === productId);
      }

      if (!productData) {
        console.warn('Product not found for cart add:', productId);
        return;
      }

      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.product_id === productId && i.variant_id === variantId
        );
        let next: CartItem[];
        if (existingIdx >= 0) {
          next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + quantity,
          };
        } else {
          const newItem: CartItem = {
            id: 'guest_item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            cart_id: 'guest-cart',
            product_id: productId,
            variant_id: variantId,
            quantity,
            added_at: new Date().toISOString(),
            product: productData!,
          };
          next = [...prev, newItem];
        }
        setStoredGuestCart(next);
        return next;
      });
    } catch (err: any) {
      console.error('Error adding to guest cart:', err);
    }
  }, [cartId, items, fetchCart, toastError]);

  const removeItem = useCallback(async (cartItemId: string) => {
    if (userRef.current && cartId) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        toastError('Could not remove item', error.message);
        return;
      }
    }
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== cartItemId);
      if (!userRef.current) {
        setStoredGuestCart(next);
      }
      return next;
    });
  }, [cartId, toastError]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(cartItemId);
      return;
    }

    if (userRef.current && cartId) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        toastError('Could not update quantity', error.message);
        return;
      }
    }

    setItems((prev) => {
      const next = prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i));
      if (!userRef.current) {
        setStoredGuestCart(next);
      }
      return next;
    });
  }, [cartId, removeItem, toastError]);

  const clearCart = useCallback(async () => {
    if (userRef.current && cartId) {
      await supabase.from('cart_items').delete().eq('cart_id', cartId);
    }
    setStoredGuestCart([]);
    setItems([]);
  }, [cartId]);

  const hasItem = useCallback((productId: string, variantId: string | null = null): boolean => {
    return items.some((i) => i.product_id === productId && i.variant_id === variantId);
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
