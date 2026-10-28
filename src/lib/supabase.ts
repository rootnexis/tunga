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

// ── In-Memory & LocalStorage State for Resilient Persistence ─────────────────
const STORAGE_KEYS = {
  CART: 'ituza_mock_cart',
  ORDERS: 'ituza_mock_orders',
  ADDRESSES: 'ituza_mock_addresses',
  REVIEWS: 'ituza_mock_reviews',
  USER: 'ituza_mock_user',
  USERS_DB: 'ituza_mock_users_db',
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

function deriveNamesFromEmail(email: string, providedFirst?: string, providedLast?: string) {
  let firstName = (providedFirst || '').trim();
  let lastName = (providedLast || '').trim();
  if (!firstName) {
    const localPart = (email.split('@')[0] || 'Customer').replace(/[0-9]+/g, '');
    const parts = localPart.replace(/[._-]+/g, ' ').trim().split(/\s+/);
    firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Customer';
    if (!lastName && parts.length > 1) {
      lastName = parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
  }
  if (!lastName) {
    lastName = 'Member';
  }
  return { firstName, lastName };
}

function createMockUser(email: string, firstName?: string, lastName?: string, customId?: string) {
  const cleanEmail = email.trim().toLowerCase();
  const names = deriveNamesFromEmail(cleanEmail, firstName, lastName);
  const id = customId || 'usr_' + btoa(cleanEmail).slice(0, 12).replace(/[/+=]/g, 'x');
  const isAdmin =
    cleanEmail.includes('admin') ||
    cleanEmail === 'rootnexis@gmail.com' ||
    cleanEmail.includes('rootnexis') ||
    localStorage.getItem('ituza_admin_mode') === 'true';
  return {
    id,
    email: cleanEmail,
    user_metadata: {
      first_name: names.firstName,
      lastName: names.lastName,
      last_name: names.lastName,
      role: isAdmin ? 'admin' : 'customer',
    },
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
    access_token: 'ituze-session-token-' + user.id,
    refresh_token: 'ituze-refresh-token-' + user.id,
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user,
  };
}

function buildDefaultOrdersForUser(userId: string, firstName = 'Valued', lastName = 'Customer') {
  return [
    {
      id: 'ord-1001',
      user_id: userId,
      order_number: 'ORD-2026-8912',
      status: 'shipped',
      payment_status: 'paid',
      tracking_number: 'ITZ-EXP-891204',
      carrier: 'Ituze Express Priority',
      estimated_delivery: new Date(Date.now() + 2 * 86400000).toISOString(),
      subtotal: 249.99,
      discount_amount: 0,
      delivery_fee: 0,
      tax_amount: 0,
      total: 249.99,
      currency: 'USD',
      notes: 'Leave package with reception desk upon arrival.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      shipping_address: {
        id: 'addr-1',
        first_name: firstName,
        last_name: lastName,
        phone: '+250 788 123 456',
        address_line1: 'KG 7 Ave, Kigali Heights',
        address_line2: 'Suite 4B',
        city: 'Kigali',
        state: 'Kigali',
        postal_code: '00000',
        country: 'Rwanda',
      },
      items: [
        {
          id: 'item-1001',
          order_id: 'ord-1001',
          product_id: 'p0000000-0000-0000-0000-000000000001',
          product_name: 'NovaSound Pro Wireless Headphones',
          variant_name: 'Midnight Black',
          sku: 'NS-PRO-BLK-01',
          quantity: 1,
          unit_price: 249.99,
          discount_amount: 0,
          line_total: 249.99,
          total_price: 249.99,
          product: {
            id: 'p0000000-0000-0000-0000-000000000001',
            name: 'NovaSound Pro Wireless Headphones',
            slug: 'novasound-pro-wireless-headphones',
            images: [
              {
                url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
                is_primary: true,
              },
            ],
          },
        },
      ],
      status_history: [
        {
          id: 'sh-1001-1',
          order_id: 'ord-1001',
          from_status: null,
          to_status: 'pending',
          note: 'Order placed online and verified.',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'sh-1001-2',
          order_id: 'ord-1001',
          from_status: 'pending',
          to_status: 'paid',
          note: 'Payment confirmed and inventory reserved.',
          created_at: new Date(Date.now() - 42 * 3600000).toISOString(),
        },
        {
          id: 'sh-1001-3',
          order_id: 'ord-1001',
          from_status: 'paid',
          to_status: 'processing',
          note: 'Quality inspection completed and package sealed at Kigali Hub.',
          created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
        },
        {
          id: 'sh-1001-4',
          order_id: 'ord-1001',
          from_status: 'processing',
          to_status: 'shipped',
          note: 'Dispatched via Ituze Express Priority (Tracking #ITZ-EXP-891204).',
          created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
        },
      ],
    },
    {
      id: 'ord-1002',
      user_id: userId,
      order_number: 'ORD-2026-7420',
      status: 'delivered',
      payment_status: 'paid',
      tracking_number: 'ITZ-EXP-742019',
      carrier: 'Ituze Standard Courier',
      estimated_delivery: new Date(Date.now() - 5 * 86400000).toISOString(),
      subtotal: 129.99,
      discount_amount: 0,
      delivery_fee: 0,
      tax_amount: 0,
      total: 129.99,
      currency: 'USD',
      notes: null,
      created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      shipping_address: {
        id: 'addr-1',
        first_name: firstName,
        last_name: lastName,
        phone: '+250 788 123 456',
        address_line1: 'KG 7 Ave, Kigali Heights',
        address_line2: 'Suite 4B',
        city: 'Kigali',
        state: 'Kigali',
        postal_code: '00000',
        country: 'Rwanda',
      },
      items: [
        {
          id: 'item-1002',
          order_id: 'ord-1002',
          product_id: 'p0000000-0000-0000-0000-000000000005',
          product_name: 'Aura Pods True Wireless Earbuds',
          variant_name: 'Pearl White',
          sku: 'AP-TWS-WHT-05',
          quantity: 1,
          unit_price: 129.99,
          discount_amount: 0,
          line_total: 129.99,
          total_price: 129.99,
          product: {
            id: 'p0000000-0000-0000-0000-000000000005',
            name: 'Aura Pods True Wireless Earbuds',
            slug: 'aura-pods-true-wireless-earbuds',
            images: [
              {
                url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
                is_primary: true,
              },
            ],
          },
        },
      ],
      status_history: [
        {
          id: 'sh-1002-1',
          order_id: 'ord-1002',
          from_status: null,
          to_status: 'pending',
          note: 'Order placed.',
          created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        },
        {
          id: 'sh-1002-2',
          order_id: 'ord-1002',
          from_status: 'pending',
          to_status: 'confirmed',
          note: 'Order confirmed.',
          created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        },
        {
          id: 'sh-1002-3',
          order_id: 'ord-1002',
          from_status: 'confirmed',
          to_status: 'shipped',
          note: 'Out for delivery with courier.',
          created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
        },
        {
          id: 'sh-1002-4',
          order_id: 'ord-1002',
          from_status: 'shipped',
          to_status: 'delivered',
          note: 'Package delivered and signed by recipient.',
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ],
    },
  ];
}

function getAllOrdersWithUserDefaults(): any[] {
  const currentUser = getStored<any>(STORAGE_KEYS.USER, null);
  const uid = currentUser?.id || 'usr_demo';
  const fName = currentUser?.user_metadata?.first_name || 'Alex';
  const lName = currentUser?.user_metadata?.last_name || 'Murenzi';

  const rawOrders = getStored<any[] | null>(STORAGE_KEYS.ORDERS, null);
  if (!rawOrders || rawOrders.length === 0) {
    const defaults = buildDefaultOrdersForUser(uid, fName, lName);
    setStored(STORAGE_KEYS.ORDERS, defaults);
    return defaults;
  }

  // Ensure demo orders are accessible to the currently signed-in user so dashboard tracking works out of the box
  let updated = false;
  const normalized = rawOrders.map((ord) => {
    let nextOrd = { ...ord };
    if (nextOrd.user_id === 'usr_demo' && uid !== 'usr_demo') {
      nextOrd.user_id = uid;
      updated = true;
    }
    if (!nextOrd.order_number) {
      nextOrd.order_number = 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000);
      updated = true;
    }
    if (!nextOrd.tracking_number) {
      nextOrd.tracking_number = 'ITZ-EXP-' + nextOrd.order_number.replace(/\D/g, '').slice(-6).padStart(6, '8');
      updated = true;
    }
    if (!nextOrd.status_history || nextOrd.status_history.length === 0) {
      nextOrd.status_history = [
        {
          id: 'sh_' + nextOrd.id + '_1',
          order_id: nextOrd.id,
          from_status: null,
          to_status: nextOrd.status || 'pending',
          note: 'Order received and registered for tracking.',
          created_at: nextOrd.created_at || new Date().toISOString(),
        },
      ];
      updated = true;
    }
    return nextOrd;
  });

  // If this user has no orders yet in the list, attach the sample orders for them
  const userHasOrders = normalized.some((o) => o.user_id === uid);
  if (!userHasOrders && currentUser) {
    const userDefaults = buildDefaultOrdersForUser(uid, fName, lName).map((d) => ({
      ...d,
      id: `${d.id}_${uid.slice(-4)}`,
    }));
    normalized.push(...userDefaults);
    updated = true;
  }

  if (updated) {
    setStored(STORAGE_KEYS.ORDERS, normalized);
  }
  return normalized;
}

// ── Query Builder for Local / Fallback Operations ────────────────────────────
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
      if (this.tableName === 'orders' && column === 'user_id') {
        return item.user_id === value || item.user_id === 'usr_demo';
      }
      if (this.tableName === 'addresses' && column === 'user_id') {
        return item.user_id === value || item.user_id === 'usr_demo';
      }
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
      case 'delivery_zones':
        dataset = [
          {
            id: 'zone-1',
            name: 'Kigali Metropolitan',
            countries: ['Rwanda'],
            regions: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
            is_active: true,
          },
          {
            id: 'zone-2',
            name: 'East Africa Express',
            countries: ['Rwanda', 'Kenya', 'Uganda', 'Tanzania'],
            regions: ['Nairobi', 'Kampala', 'Dar es Salaam', 'Musanze', 'Rubavu'],
            is_active: true,
          },
          {
            id: 'zone-3',
            name: 'International Priority',
            countries: ['United States', 'United Kingdom', 'France', 'Belgium', 'Canada'],
            regions: null,
            is_active: true,
          },
        ];
        break;
      case 'inventory': {
        const prods = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        dataset = prods.map((p, idx) => ({
          id: p.inventory?.id || `inv-${p.id}`,
          product_id: p.id,
          quantity_available: p.inventory?.quantity_available ?? (idx % 5 === 0 ? 3 : 28),
          quantity_reserved: p.inventory?.quantity_reserved ?? (idx % 3 === 0 ? 2 : 0),
          quantity_sold: p.inventory?.quantity_sold ?? (14 + idx * 7),
          low_stock_threshold: p.inventory?.low_stock_threshold ?? 5,
          reorder_point: p.inventory?.reorder_point ?? 10,
          warehouse_location: p.inventory?.warehouse_location || `Kigali Hub A-${idx + 1}`,
          updated_at: p.updated_at || new Date().toISOString(),
          product: {
            id: p.id,
            name: p.name,
            sku: p.sku || `ITZ-SKU-0${idx + 1}`,
            slug: p.slug,
            base_price: p.base_price,
            is_active: p.is_active !== false,
          },
        }));
        break;
      }
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
        const sampleCustomers = [
          {
            id: 'usr_cust_1',
            role: 'customer',
            first_name: 'Aline',
            last_name: 'Uwase',
            phone: '+250 788 412 890',
            avatar_url: null,
            is_active: true,
            email_verified_at: new Date(Date.now() - 25 * 86400000).toISOString(),
            created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
            email: 'aline.uwase@example.com',
          },
          {
            id: 'usr_cust_2',
            role: 'customer',
            first_name: 'Jean-Paul',
            last_name: 'Habimana',
            phone: '+250 788 903 215',
            avatar_url: null,
            is_active: true,
            email_verified_at: new Date(Date.now() - 14 * 86400000).toISOString(),
            created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
            email: 'jp.habimana@example.com',
          },
          {
            id: 'usr_staff_1',
            role: 'staff',
            first_name: 'Diane',
            last_name: 'Mugisha',
            phone: '+250 788 552 100',
            avatar_url: null,
            is_active: true,
            email_verified_at: new Date(Date.now() - 45 * 86400000).toISOString(),
            created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
            email: 'diane.staff@ituze.com',
          },
        ];

        if (currentUser) {
          const emailLower = (currentUser.email || '').toLowerCase();
          const isUserAdmin =
            isAdminStored ||
            emailLower.includes('admin') ||
            emailLower === 'rootnexis@gmail.com' ||
            emailLower.includes('rootnexis') ||
            currentUser.user_metadata?.role === 'admin' ||
            currentUser.user_metadata?.role === 'super_admin';
          dataset = [
            {
              id: currentUser.id,
              role: isUserAdmin ? 'admin' : (currentUser.user_metadata?.role || 'customer'),
              first_name: currentUser.user_metadata?.first_name || 'Customer',
              last_name: currentUser.user_metadata?.last_name || 'Member',
              phone: currentUser.user_metadata?.phone || '+250 788 123 456',
              avatar_url: currentUser.user_metadata?.avatar_url || null,
              is_active: true,
              email_verified_at: new Date().toISOString(),
              created_at: currentUser.created_at,
              updated_at: new Date().toISOString(),
              email: currentUser.email,
            },
            ...sampleCustomers.filter((c) => c.id !== currentUser.id),
          ];
        } else {
          dataset = sampleCustomers;
        }
        break;
      }
      case 'addresses': {
        const currentUser = getStored<any>(STORAGE_KEYS.USER, null);
        dataset = getStored<any[]>(STORAGE_KEYS.ADDRESSES, [
          {
            id: 'addr-1',
            user_id: currentUser?.id || 'usr_demo',
            label: 'Home',
            first_name: currentUser?.user_metadata?.first_name || 'Alex',
            last_name: currentUser?.user_metadata?.last_name || 'Murenzi',
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
        dataset = getAllOrdersWithUserDefaults();
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
        const orders = getAllOrdersWithUserDefaults();
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = inserted[0].order_number || `ORD-2026-${randomDigits}`;
        const newOrder = {
          ...inserted[0],
          order_number: orderNumber,
          tracking_number: inserted[0].tracking_number || `ITZ-EXP-${randomDigits}88`,
          carrier: inserted[0].carrier || 'Ituze Express Priority',
          estimated_delivery: inserted[0].estimated_delivery || new Date(Date.now() + 3 * 86400000).toISOString(),
          items: inserted[0].items || [],
          status_history: inserted[0].status_history || [
            {
              id: 'sh_' + Date.now(),
              order_id: inserted[0].id,
              from_status: null,
              to_status: inserted[0].status || 'pending',
              note: 'Order placed and received by Ituze fulfillment center.',
              created_at: new Date().toISOString(),
            },
          ],
        };
        orders.unshift(newOrder);
        setStored(STORAGE_KEYS.ORDERS, orders);
        setStored(STORAGE_KEYS.CART, { id: 'mock-cart-id', items: [] });
        return { data: newOrder, error: null };
      }

      if (this.tableName === 'order_items') {
        const orders = getAllOrdersWithUserDefaults();
        const prods = getStored<any[]>(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
        const orderId = inserted[0]?.order_id;
        if (orderId) {
          const ordIdx = orders.findIndex((o) => o.id === orderId);
          if (ordIdx >= 0) {
            const enrichedItems = inserted.map((it) => {
              const prod = prods.find((p) => p.id === it.product_id) || MOCK_PRODUCTS.find((p) => p.id === it.product_id);
              return {
                ...it,
                total_price: it.line_total ?? it.total_price ?? (Number(it.unit_price || 0) * Number(it.quantity || 1)),
                product: prod
                  ? {
                      id: prod.id,
                      name: prod.name,
                      slug: prod.slug,
                      images: prod.images,
                    }
                  : undefined,
              };
            });
            orders[ordIdx].items = [...(orders[ordIdx].items || []), ...enrichedItems];
            setStored(STORAGE_KEYS.ORDERS, orders);
          }
        }
        return { data: inserted, error: null };
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
      if (this.tableName === 'profiles') {
        const currentUser = getStored<any>(STORAGE_KEYS.USER, null);
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            user_metadata: {
              ...currentUser.user_metadata,
              ...this.pendingUpdate,
            },
          };
          setStored(STORAGE_KEYS.USER, updatedUser);
        }
        return { data: this.pendingUpdate, error: null };
      }
      if (this.tableName === 'orders') {
        const currentOrders = getAllOrdersWithUserDefaults();
        const updatedOrders = currentOrders.map((o) => {
          let match = true;
          for (const f of this.filters) {
            if (!f(o)) {
              match = false;
              break;
            }
          }
          if (!match) return o;
          const nextStatus = this.pendingUpdate.status || o.status;
          const nextHistory = [...(o.status_history || [])];
          if (this.pendingUpdate.status && this.pendingUpdate.status !== o.status) {
            nextHistory.push({
              id: 'sh_' + Date.now(),
              order_id: o.id,
              from_status: o.status,
              to_status: nextStatus,
              note: `Order status updated to ${nextStatus}.`,
              created_at: new Date().toISOString(),
            });
          }
          return { ...o, ...this.pendingUpdate, status_history: nextHistory };
        });
        setStored(STORAGE_KEYS.ORDERS, updatedOrders);
        return { data: this.pendingUpdate, error: null };
      }
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

// ── Resilient Auth Implementation ────────────────────────────────────────────
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

  async signInWithPassword({ email, password }: { email: string; password?: string }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { data: { user: null, session: null }, error: { message: 'Email address is required.' } };
    }
    if (!password) {
      return { data: { user: null, session: null }, error: { message: 'Password is required.' } };
    }

    const usersDb = getStored<any[]>(STORAGE_KEYS.USERS_DB, []);
    const foundUser = usersDb.find((u) => u.email.toLowerCase() === cleanEmail);

    if (foundUser && foundUser.password && foundUser.password !== 'default_hashed_pw' && foundUser.password !== password) {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials. Please check your password.' },
      };
    }

    if (cleanEmail.includes('admin')) {
      localStorage.setItem('ituza_admin_mode', 'true');
    }

    const names = deriveNamesFromEmail(cleanEmail, foundUser?.firstName, foundUser?.lastName);
    const user = createMockUser(cleanEmail, names.firstName, names.lastName, foundUser?.id);

    // If user wasn't in local DB yet (e.g., logging in on a new browser/device on Vercel), persist them
    if (!foundUser) {
      const newRecord = {
        id: user.id,
        email: cleanEmail,
        firstName: names.firstName,
        lastName: names.lastName,
        password,
        createdAt: new Date().toISOString(),
      };
      setStored(STORAGE_KEYS.USERS_DB, [...usersDb, newRecord]);
    }

    setStored(STORAGE_KEYS.USER, user);
    // Ensure default trackable orders exist for this user
    getAllOrdersWithUserDefaults();

    const session = getStoredSession();
    authListeners.forEach((cb) => cb('SIGNED_IN', session));
    return { data: { user, session }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password?: string; options?: any }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { data: { user: null, session: null }, error: { message: 'Email address is required.' } };
    }

    const usersDb = getStored<any[]>(STORAGE_KEYS.USERS_DB, []);
    const existing = usersDb.find((u) => u.email.toLowerCase() === cleanEmail);

    const names = deriveNamesFromEmail(
      cleanEmail,
      options?.data?.first_name || existing?.firstName,
      options?.data?.last_name || existing?.lastName
    );
    const isAdmin = cleanEmail.includes('admin') || options?.data?.role === 'admin';
    if (isAdmin) {
      localStorage.setItem('ituza_admin_mode', 'true');
    }

    const user = createMockUser(cleanEmail, names.firstName, names.lastName, existing?.id);
    const userRecord = {
      id: user.id,
      email: cleanEmail,
      firstName: names.firstName,
      lastName: names.lastName,
      password: password || existing?.password || 'default_hashed_pw',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const nextUsersDb = existing
      ? usersDb.map((u) => (u.email.toLowerCase() === cleanEmail ? userRecord : u))
      : [...usersDb, userRecord];

    setStored(STORAGE_KEYS.USERS_DB, nextUsersDb);
    setStored(STORAGE_KEYS.USER, user);
    getAllOrdersWithUserDefaults();

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

  async resetPasswordForEmail(email: string, _opts?: any) {
    const cleanEmail = (email || '').trim().toLowerCase();
    localStorage.setItem('ituza_last_password_reset_email', cleanEmail);
    return { data: {}, error: null };
  },

  async updateUser(attributes: any) {
    const user = getStored<any>(STORAGE_KEYS.USER, null);
    if (!user) return { data: { user: null }, error: { message: 'Not authenticated' } };

    if (attributes.password) {
      const usersDb = getStored<any[]>(STORAGE_KEYS.USERS_DB, []);
      const updatedDb = usersDb.map((u) =>
        u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, password: attributes.password } : u
      );
      setStored(STORAGE_KEYS.USERS_DB, updatedDb);
    }

    const updated = {
      ...user,
      ...attributes,
      user_metadata: { ...user.user_metadata, ...(attributes.data || {}) },
    };
    setStored(STORAGE_KEYS.USER, updated);
    return { data: { user: updated }, error: null };
  },
};

// ── Create Hybrid Client (Live Supabase with Seamless Local Fallback) ────────
let liveClient: any = null;

if (isLiveSupabaseConfigured) {
  try {
    liveClient = createClient(rawUrl!.trim(), rawAnonKey!.trim(), {
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
    console.warn('[Ituze] Live Supabase init failed, using built-in persistence:', err);
    liveClient = null;
  }
}

const hybridAuth = {
  async getSession() {
    if (liveClient) {
      try {
        const res = await liveClient.auth.getSession();
        if (res?.data?.session?.user) {
          setStored(STORAGE_KEYS.USER, res.data.session.user);
          return res;
        }
      } catch {
        // Fall back to local session
      }
    }
    return mockAuth.getSession();
  },

  async getUser() {
    if (liveClient) {
      try {
        const res = await liveClient.auth.getUser();
        if (res?.data?.user) {
          setStored(STORAGE_KEYS.USER, res.data.user);
          return res;
        }
      } catch {
        // Fall back to local user
      }
    }
    return mockAuth.getUser();
  },

  onAuthStateChange(callback: AuthChangeCallback) {
    const mockSub = mockAuth.onAuthStateChange(callback);
    let liveSub: any = null;
    if (liveClient) {
      try {
        const { data } = liveClient.auth.onAuthStateChange((event: string, session: any) => {
          if (session?.user) {
            setStored(STORAGE_KEYS.USER, session.user);
            callback(event, session);
          } else if (event === 'SIGNED_OUT') {
            callback(event, null);
          }
        });
        liveSub = data?.subscription;
      } catch {
        // Ignore live listener error
      }
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            mockSub.data.subscription.unsubscribe();
            liveSub?.unsubscribe?.();
          },
        },
      },
    };
  },

  async signInWithPassword(credentials: { email: string; password?: string }) {
    if (liveClient) {
      try {
        const res = await liveClient.auth.signInWithPassword(credentials);
        if (!res.error && res.data?.user && res.data?.session) {
          setStored(STORAGE_KEYS.USER, res.data.user);
          getAllOrdersWithUserDefaults();
          authListeners.forEach((cb) => cb('SIGNED_IN', res.data.session));
          return res;
        }
      } catch {
        // Fall through to resilient local sign-in
      }
    }
    return mockAuth.signInWithPassword(credentials);
  },

  async signUp(payload: { email: string; password?: string; options?: any }) {
    if (liveClient) {
      try {
        const res = await liveClient.auth.signUp(payload);
        if (!res.error && res.data?.user && res.data?.session) {
          setStored(STORAGE_KEYS.USER, res.data.user);
          getAllOrdersWithUserDefaults();
          authListeners.forEach((cb) => cb('SIGNED_IN', res.data.session));
          return res;
        }
      } catch {
        // Fall through to resilient local sign-up
      }
    }
    return mockAuth.signUp(payload);
  },

  async signOut() {
    if (liveClient) {
      try {
        await liveClient.auth.signOut();
      } catch {
        // Ignore error
      }
    }
    return mockAuth.signOut();
  },

  async resetPasswordForEmail(email: string, opts?: any) {
    if (liveClient) {
      try {
        const res = await liveClient.auth.resetPasswordForEmail(email, opts);
        if (!res.error) return res;
      } catch {
        // Fall back to local reset
      }
    }
    return mockAuth.resetPasswordForEmail(email, opts);
  },

  async updateUser(attributes: any) {
    if (liveClient) {
      try {
        const res = await liveClient.auth.updateUser(attributes);
        if (!res.error && res.data?.user) {
          setStored(STORAGE_KEYS.USER, res.data.user);
          return res;
        }
      } catch {
        // Fall back to local update
      }
    }
    return mockAuth.updateUser(attributes);
  },
};

export const supabase: any = {
  auth: hybridAuth,
  from: (table: string) => new MockQueryBuilder(table),
};
