import { createClient } from '@supabase/supabase-js';
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_BRANDS,
  MOCK_COUPONS,
  MOCK_DELIVERY_METHODS,
  MOCK_REVIEWS,
} from './mockData';

function isValidSupabaseUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('example.com') ||
    lower.includes('<') ||
    lower.includes('>') ||
    lower === 'undefined' ||
    lower === 'null'
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.hostname.includes('placeholder');
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('<') ||
    lower.includes('>') ||
    lower === 'undefined' ||
    lower === 'null'
  ) {
    return false;
  }
  return trimmed.length > 20;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isLiveSupabaseConfigured = isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawAnonKey);

if (!isLiveSupabaseConfigured) {
  console.info(
    '[Tunga] Running in standalone demo mode with built-in product catalog and offline storage. Set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect a live Supabase instance.'
  );
}

// ── In-Memory & LocalStorage State for Standalone Demo ───────────────────────
const STORAGE_KEYS = {
  CART: 'ituza_mock_cart',
  ORDERS: 'ituza_mock_orders',
  ADDRESSES: 'ituza_mock_addresses',
  REVIEWS: 'ituza_mock_reviews',
  USER: 'ituza_mock_user',
  WISHLIST: 'ituza_mock_wishlist',
  PRODUCTS: 'ituza_mock_products',
  CATEGORIES: 'ituza_mock_categories',
};

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage quota or access issues
  }
}

type AuthChangeCallback = (event: string, session: any) => void;
const authListeners = new Set<AuthChangeCallback>();

function createMockUser(email: string, firstName = 'Demo', lastName = 'User') {
  const id = 'usr_' + btoa(email).slice(0, 12).replace(/[/+=]/g, 'x');
  const isAdmin = email.toLowerCase().includes('admin') || localStorage.getItem('ituza_admin_mode') === 'true';
  return {
    id,
    email,
    user_metadata: { first_name: firstName, last_name: lastName, role: isAdmin ? 'admin' : 'customer' },
    role: 'authenticated',
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
  };
}

function getStoredSession() {
  const user = getStored<any>(STORAGE_KEYS.USER, null);
  if (!user) return null;
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

// ── Query Builder for Mock Operations ────────────────────────────────────────
class MockQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderFn: ((a: any, b: any) => number) | null = null;
  private limitVal: number | null = null;
  private rangeVal: [number, number] | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private pendingInsert: any = null;
  private pendingUpdate: any = null;
  private pendingUpsert: any = null;
  private pendingDelete = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns = '*', _options?: { count?: 'exact' }) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => {
      if (column.includes('.')) {
        const parts = column.split('.');
        let curr = item;
        for (const p of parts) {
          curr = curr?.[p];
        }
        return curr === value;
      }
      return item[column] === value;
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((item) => {
      const val = String(item[column] ?? '').toLowerCase();
      return val.includes(cleanPattern);
    });
    return this;
  }

  gte(column: string, value: number) {
    this.filters.push((item) => Number(item[column]) >= value);
    return this;
  }

  lte(column: string, value: number) {
    this.filters.push((item) => Number(item[column]) <= value);
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderFn = (a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    };
    return this;
  }

  range(from: number, to: number) {
    this.rangeVal = [from, to];
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  insert(data: any) {
    this.pendingInsert = data;
    return this;
  }

  update(data: any) {
    this.pendingUpdate = data;
    return this;
  }

  upsert(data: any, _options?: any) {
    this.pendingUpsert = data;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  private execute() {
    let dataset: any[] = [];

    switch (this.tableName) {
      case 'products':
        dataset = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        break;
      case 'categories':
        dataset = [...MOCK_CATEGORIES];
        break;
      case 'brands':
        dataset = [...MOCK_BRANDS];
        break;
      case 'coupons':
        dataset = [...MOCK_COUPONS];
        break;
      case 'delivery_methods':
        dataset = [...MOCK_DELIVERY_METHODS];
        break;
      case 'reviews': {
        const storedReviews = getStored<any[]>(STORAGE_KEYS.REVIEWS, []);
        dataset = [...MOCK_REVIEWS, ...storedReviews];
        break;
      }
      case 'carts': {
        const cart = getStored<any>(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        dataset = [cart];
        break;
      }
      case 'cart_items': {
        const cart = getStored<any>(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        dataset = cart.items || [];
        break;
      }
      case 'profiles': {
        const currentUser = getStored<any>(STORAGE_KEYS.USER, null);
        const isAdminStored = localStorage.getItem('ituza_admin_mode') === 'true';
        if (currentUser) {
          const emailLower = (currentUser.email || '').toLowerCase();
          const isUserAdmin =
            isAdminStored ||
            emailLower.includes('admin') ||
            emailLower === 'rootnexis@gmail.com' ||
            currentUser.user_metadata?.role === 'admin' ||
            currentUser.user_metadata?.role === 'super_admin';
          dataset = [
            {
              id: currentUser.id,
              role: isUserAdmin ? 'admin' : (currentUser.user_metadata?.role || 'customer'),
              first_name: currentUser.user_metadata?.first_name || (isUserAdmin ? 'RootNexis' : 'Valued'),
              last_name: currentUser.user_metadata?.last_name || (isUserAdmin ? 'Admin' : 'Customer'),
              phone: '+250 788 123 456',
              avatar_url: null,
              is_active: true,
              email_verified_at: new Date().toISOString(),
              created_at: currentUser.created_at,
              updated_at: new Date().toISOString(),
              email: currentUser.email,
            },
          ];
        } else if (isAdminStored) {
          dataset = [
            {
              id: 'usr_admin',
              role: 'admin',
              first_name: 'Store',
              last_name: 'Administrator',
              phone: '+250 788 000 001',
              avatar_url: null,
              is_active: true,
              email_verified_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email: 'admin@ituza.com',
            },
          ];
        } else {
          dataset = [];
        }
        break;
      }
      case 'addresses': {
        dataset = getStored<any[]>(STORAGE_KEYS.ADDRESSES, [
          {
            id: 'addr-1',
            user_id: 'usr_demo',
            label: 'Home',
            first_name: 'Alex',
            last_name: 'Murenzi',
            phone: '+250 788 000 111',
            address_line1: 'KG 7 Ave, Kigali Heights',
            address_line2: 'Apt 4B',
            city: 'Kigali',
            state: 'Kigali',
            postal_code: '00000',
            country: 'Rwanda',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        break;
      }
      case 'orders': {
        dataset = getStored<any[]>(STORAGE_KEYS.ORDERS, [
          {
            id: 'ord-1001',
            user_id: 'usr_demo',
            order_number: 'ORD-2026-8912',
            status: 'delivered',
            payment_status: 'successful',
            subtotal: 249.99,
            discount_total: 0,
            delivery_fee: 0,
            total: 249.99,
            currency: 'USD',
            notes: null,
            created_at: new Date('2026-02-01').toISOString(),
            items: [
              {
                id: 'item-1',
                product_name: 'NovaSound Pro Wireless Headphones',
                quantity: 1,
                unit_price: 249.99,
                total_price: 249.99,
              },
            ],
          },
        ]);
        break;
      }
      case 'wishlists': {
        dataset = getStored<any[]>(STORAGE_KEYS.WISHLIST, []);
        break;
      }
      default:
        dataset = [];
    }

    // Handle Write Operations
    if (this.pendingUpsert || this.pendingInsert) {
      const payload = this.pendingUpsert || this.pendingInsert;
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = rows.map((r) => ({
        ...r,
        id: r.id || 'id_' + Math.random().toString(36).substring(2, 9),
        created_at: r.created_at || new Date().toISOString(),
      }));

      if (this.tableName === 'products') {
        const currentProds = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        const insertedProducts = rows.map((r) => {
          const pId = r.id || 'prod_' + Math.random().toString(36).substring(2, 9);
          const existing = currentProds.find((p) => p.id === pId);
          if (existing) {
            return { ...existing, ...r };
          }
          const cat = MOCK_CATEGORIES.find((c) => c.id === r.category_id) || { id: r.category_id || 'cat-1', name: 'General', slug: 'general' };
          const br = MOCK_BRANDS.find((b) => b.id === r.brand_id) || null;
          return {
            ...r,
            id: pId,
            slug: r.slug || (r.name ? r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : pId),
            currency: r.currency || 'USD',
            is_active: r.is_active !== undefined ? r.is_active : true,
            is_featured: r.is_featured !== undefined ? r.is_featured : false,
            is_archived: r.is_archived !== undefined ? r.is_archived : false,
            category: cat,
            brand: br,
            images: r.images && r.images.length > 0 ? r.images : [{ id: 'img_' + pId, url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', alt_text: r.name, is_primary: true, sort_order: 0 }],
            inventory: { quantity_available: Number(r.quantity_available ?? 50), low_stock_threshold: 5 },
            created_at: r.created_at || new Date().toISOString(),
          };
        });

        const mergedProds = [...currentProds];
        for (const newP of insertedProducts) {
          const idx = mergedProds.findIndex((p) => p.id === newP.id);
          if (idx >= 0) {
            mergedProds[idx] = { ...mergedProds[idx], ...newP };
          } else {
            mergedProds.unshift(newP);
          }
        }
        setStored(STORAGE_KEYS.PRODUCTS, mergedProds);
        return { data: Array.isArray(payload) ? insertedProducts : insertedProducts[0], error: null };
      }

      if (this.tableName === 'inventory') {
        const currentProds = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        for (const inv of rows) {
          const pIdx = currentProds.findIndex((p) => p.id === inv.product_id);
          if (pIdx >= 0) {
            currentProds[pIdx].inventory = {
              quantity_available: Number(inv.quantity_available ?? 50),
              low_stock_threshold: Number(inv.low_stock_threshold ?? 5),
            };
          }
        }
        setStored(STORAGE_KEYS.PRODUCTS, currentProds);
        return { data: rows[0], error: null };
      }

      if (this.tableName === 'product_images') {
        const currentProds = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        for (const img of rows) {
          const pIdx = currentProds.findIndex((p) => p.id === img.product_id);
          if (pIdx >= 0) {
            const existingImages = currentProds[pIdx].images || [];
            const imgObj = {
              id: img.id || 'img_' + Math.random().toString(36).substring(2, 9),
              url: img.url,
              alt_text: img.alt_text || '',
              is_primary: img.is_primary || existingImages.length === 0,
              sort_order: img.sort_order || existingImages.length,
            };
            currentProds[pIdx].images = [...existingImages.filter((x: any) => x.id !== imgObj.id), imgObj];
          }
        }
        setStored(STORAGE_KEYS.PRODUCTS, currentProds);
        return { data: rows[0], error: null };
      }

      if (this.tableName === 'carts') {
        const cart = { id: inserted[0].id || 'mock-cart-id', user_id: inserted[0].user_id, items: [] };
        setStored(STORAGE_KEYS.CART, cart);
        return { data: cart, error: null };
      }

      if (this.tableName === 'cart_items') {
        const cart = getStored<any>(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        const existingIdx = cart.items.findIndex(
          (it: any) => it.product_id === inserted[0].product_id && it.variant_id === inserted[0].variant_id
        );
        if (existingIdx >= 0) {
          cart.items[existingIdx].quantity += inserted[0].quantity || 1;
        } else {
          // Attach full product record for client consumption
          const prods = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
          const prod = prods.find((p) => p.id === inserted[0].product_id) || MOCK_PRODUCTS.find((p) => p.id === inserted[0].product_id);
          cart.items.push({
            ...inserted[0],
            product: prod,
            added_at: new Date().toISOString(),
          });
        }
        setStored(STORAGE_KEYS.CART, cart);
        return { data: inserted[0], error: null };
      }

      if (this.tableName === 'orders') {
        const orders = getStored<any[]>(STORAGE_KEYS.ORDERS, []);
        orders.unshift(inserted[0]);
        setStored(STORAGE_KEYS.ORDERS, orders);
        // Clear cart
        setStored(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        return { data: inserted[0], error: null };
      }

      if (this.tableName === 'addresses') {
        const addresses = getStored<any[]>(STORAGE_KEYS.ADDRESSES, []);
        addresses.push(inserted[0]);
        setStored(STORAGE_KEYS.ADDRESSES, addresses);
        return { data: inserted[0], error: null };
      }

      if (this.tableName === 'reviews') {
        const reviews = getStored<any[]>(STORAGE_KEYS.REVIEWS, []);
        reviews.unshift(inserted[0]);
        setStored(STORAGE_KEYS.REVIEWS, reviews);
        return { data: inserted[0], error: null };
      }

      return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
    }

    if (this.pendingUpdate) {
      if (this.tableName === 'products') {
        const currentProds = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        const updatedProds = currentProds.map((p) => {
          let match = true;
          for (const f of this.filters) {
            if (!f(p)) {
              match = false;
              break;
            }
          }
          return match ? { ...p, ...this.pendingUpdate } : p;
        });
        setStored(STORAGE_KEYS.PRODUCTS, updatedProds);
        return { data: this.pendingUpdate, error: null };
      }
      if (this.tableName === 'cart_items') {
        const cart = getStored<any>(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        cart.items = cart.items.map((it: any) => {
          let match = true;
          for (const f of this.filters) {
            if (!f(it)) {
              match = false;
              break;
            }
          }
          return match ? { ...it, ...this.pendingUpdate } : it;
        });
        setStored(STORAGE_KEYS.CART, cart);
        return { data: this.pendingUpdate, error: null };
      }
      return { data: this.pendingUpdate, error: null };
    }

    if (this.pendingDelete) {
      if (this.tableName === 'products') {
        const currentProds = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        const filtered = currentProds.filter((p) => {
          for (const f of this.filters) {
            if (f(p)) return false;
          }
          return true;
        });
        setStored(STORAGE_KEYS.PRODUCTS, filtered);
        return { data: null, error: null };
      }
      if (this.tableName === 'cart_items') {
        const cart = getStored<any>(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        cart.items = cart.items.filter((it: any) => {
          for (const f of this.filters) {
            if (f(it)) return false;
          }
          return true;
        });
        setStored(STORAGE_KEYS.CART, cart);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    // Apply filters
    for (const filter of this.filters) {
      dataset = dataset.filter(filter);
    }

    const totalCount = dataset.length;

    // Apply ordering
    if (this.orderFn) {
      dataset.sort(this.orderFn);
    }

    // Apply pagination / range
    if (this.rangeVal) {
      const [from, to] = this.rangeVal;
      dataset = dataset.slice(from, to + 1);
    } else if (this.limitVal !== null) {
      dataset = dataset.slice(0, this.limitVal);
    }

    if (this.isSingle) {
      const singleItem = dataset[0] ?? null;
      return { data: singleItem, count: totalCount, error: singleItem ? null : { message: 'Row not found' } };
    }

    if (this.isMaybeSingle) {
      const singleItem = dataset[0] ?? null;
      return { data: singleItem, count: totalCount, error: null };
    }

    return { data: dataset, count: totalCount, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = this.execute();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

// ── Mock Auth Implementation ────────────────────────────────────────────────
const mockAuth = {
  async getSession() {
    const session = getStoredSession();
    return { data: { session }, error: null };
  },

  async getUser() {
    const user = getStored<any>(STORAGE_KEYS.USER, null);
    return { data: { user }, error: null };
  },

  onAuthStateChange(callback: AuthChangeCallback) {
    authListeners.add(callback);
    // Emit initial session event asynchronously
    setTimeout(() => {
      const session = getStoredSession();
      callback('INITIAL_SESSION', session);
    }, 10);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },

  async signInWithPassword({ email }: { email: string; password?: string }) {
    if (email.toLowerCase().includes('admin')) {
      localStorage.setItem('ituza_admin_mode', 'true');
    }
    const user = createMockUser(email);
    setStored(STORAGE_KEYS.USER, user);
    const session = getStoredSession();
    authListeners.forEach((cb) => cb('SIGNED_IN', session));
    return { data: { user, session }, error: null };
  },

  async signInWithOAuth({ provider, options }: { provider: string; options?: any }) {
    if (provider === 'google') {
      const email = options?.email || 'rootnexis@gmail.com';
      const firstName = options?.data?.first_name || 'RootNexis';
      const lastName = options?.data?.last_name || 'Admin';
      const emailLower = email.toLowerCase();
      if (emailLower.includes('admin') || emailLower === 'rootnexis@gmail.com' || options?.data?.role === 'admin') {
        localStorage.setItem('ituza_admin_mode', 'true');
      }
      const user = createMockUser(email, firstName, lastName);
      (user as any).app_metadata = { provider: 'google', providers: ['google'] };
      setStored(STORAGE_KEYS.USER, user);
      const session = getStoredSession();
      authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { user, session, provider: 'google', url: options?.redirectTo || null }, error: null };
    }
    return { data: null, error: { message: `Unsupported provider: ${provider}` } };
  },

  async signInWithGoogle(options?: { email?: string; firstName?: string; lastName?: string }) {
    return this.signInWithOAuth({
      provider: 'google',
      options: {
        email: options?.email || 'rootnexis@gmail.com',
        data: {
          first_name: options?.firstName || 'RootNexis',
          last_name: options?.lastName || 'Member',
        },
      },
    });
  },

  async signUp({ email, options }: { email: string; password?: string; options?: any }) {
    const firstName = options?.data?.first_name || 'New';
    const lastName = options?.data?.last_name || 'Member';
    if (email.toLowerCase().includes('admin') || options?.data?.role === 'admin') {
      localStorage.setItem('ituza_admin_mode', 'true');
    }
    const user = createMockUser(email, firstName, lastName);
    setStored(STORAGE_KEYS.USER, user);
    const session = getStoredSession();
    authListeners.forEach((cb) => cb('SIGNED_IN', session));
    return { data: { user, session }, error: null };
  },

  async signOut() {
    setStored(STORAGE_KEYS.USER, null);
    localStorage.removeItem('ituza_admin_mode');
    authListeners.forEach((cb) => cb('SIGNED_OUT', null));
    return { error: null };
  },

  async resetPasswordForEmail(_email: string, _opts?: any) {
    return { data: {}, error: null };
  },

  async updateUser(attributes: any) {
    const user = getStored<any>(STORAGE_KEYS.USER, null);
    if (!user) return { data: { user: null }, error: { message: 'Not authenticated' } };
    const updated = {
      ...user,
      ...attributes,
      user_metadata: { ...user.user_metadata, ...(attributes.data || {}) },
    };
    setStored(STORAGE_KEYS.USER, updated);
    return { data: { user: updated }, error: null };
  },
};

// ── Create or Proxy the Supabase Client ──────────────────────────────────────
let clientInstance: any;

if (isLiveSupabaseConfigured) {
  try {
    // Live Supabase instance
    clientInstance = createClient(rawUrl!.trim(), rawAnonKey!.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
    });
  } catch (err) {
    console.warn('[Tunga] Failed to initialize live Supabase client, using fallback demo store:', err);
    clientInstance = {
      auth: mockAuth,
      from: (table: string) => new MockQueryBuilder(table),
    };
  }
} else {
  // Pure local client for demo and offline execution
  clientInstance = {
    auth: mockAuth,
    from: (table: string) => new MockQueryBuilder(table),
  };
}

export const supabase: any = clientInstance;

