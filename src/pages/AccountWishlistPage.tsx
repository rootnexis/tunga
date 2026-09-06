import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { formatCurrency, getEffectivePrice } from '@/utils/formatters';
import { useT } from '@/contexts/LanguageContext';
import type { WishlistItem } from '@/types';

export default function AccountWishlistPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { success } = useToast();
  const { t } = useT();
  const [items, setItems]     = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: wl } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!wl) { setIsLoading(false); return; }
    const { data } = await supabase
      .from('wishlist_items')
      .select(`
        id, wishlist_id, product_id, added_at,
        product:products(id, name, slug, base_price, sale_price, currency,
          images:product_images(id, url, alt_text, is_primary, sort_order),
          inventory(quantity_available)
        )
      `)
      .eq('wishlist_id', wl.id)
      .order('added_at', { ascending: false });
    setItems((data as unknown as WishlistItem[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (itemId: string) => {
    await supabase.from('wishlist_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const moveToCart = async (item: WishlistItem) => {
    if (!item.product) return;
    await addItem(item.product.id);
    await remove(item.id);
    success('Moved to cart', item.product.name);
  };

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f1f5f9"/></svg>');

  return (
    <>
      <PageSeo title={`${t.account.wishlist} — ${t.siteName}`} />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">{t.account.wishlist}</h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{items.length} item(s)</span>
        </div>
        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              description="Save items you love and come back to them later."
              action={<Link to="/shop" className="btn btn-primary">Browse Products</Link>}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
            {items.map(item => {
              const product = item.product!;
              const img = product.images?.find(i => i.is_primary) ?? product.images?.[0];
              const price = getEffectivePrice(product);
              const inStock = (product.inventory?.quantity_available ?? 0) > 0;
              return (
                <div key={item.id} className="product-card">
                  <Link to={`/product/${product.slug}`}>
                    <div className="product-card-image">
                      <img src={img?.url ?? PLACEHOLDER} alt={img?.alt_text ?? product.name} />
                    </div>
                    <div className="product-card-body">
                      <p className="product-card-name">{product.name}</p>
                      <p className="product-price-current">{formatCurrency(price, product.currency)}</p>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-4) var(--space-4)' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={!inStock}
                      onClick={() => moveToCart(item)}
                    >
                      {inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(item.id)} aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
