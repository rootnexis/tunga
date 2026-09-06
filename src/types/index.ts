// Core application types — all synchronized with the database schema

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'super_admin';

export type OrderStatus =
  | 'pending'
  | 'payment_processing'
  | 'paid'
  | 'processing'
  | 'ready_for_shipment'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'payment_failed'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_customer'
  | 'resolved'
  | 'closed';

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined from auth.users
  email?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  children?: Category[];
  parent?: Category;
  product_count?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  storage_path: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  attributes: Record<string, string>; // e.g. { color: 'Red', size: 'XL' }
  price_modifier: number;
  is_active: boolean;
  created_at: string;
  // Joined
  inventory?: Inventory;
  images?: ProductImage[];
}

export interface Product {
  id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  base_price: number;
  sale_price: number | null;
  currency: string;
  weight_kg: number | null;
  dimensions_cm: { l: number; w: number; h: number } | null;
  specifications: Record<string, string> | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  brand?: Brand;
  images?: ProductImage[];
  variants?: ProductVariant[];
  inventory?: Inventory;
  average_rating?: number;
  review_count?: number;
}

export interface Inventory {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  added_at: string;
  // Joined
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  added_at: string;
  // Joined
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applicable_to: 'all' | 'category' | 'product';
  applicable_ids: string[];
  max_uses: number | null;
  max_uses_per_customer: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryMethod {
  id: string;
  zone_id: string;
  name: string;
  description: string | null;
  estimated_days_min: number;
  estimated_days_max: number;
  base_fee: number;
  free_above_amount: number | null;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  line_total: number;
  // Joined (for display)
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
  currency: string;
  coupon_id: string | null;
  delivery_method_id: string | null;
  shipping_address: Address;
  billing_address: Address | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
  payment?: Payment;
  shipment?: Shipment;
  customer?: Profile;
  delivery_method?: DeliveryMethod;
  status_history?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_session_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: string;
  tracking_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_item_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_flagged: boolean;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
  product?: Product;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: 'in_app' | 'email' | 'sms';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  assigned_to: string | null;
  order_id: string | null;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Profile;
  assignee?: Profile;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  attachments: { name: string; url: string; size: number }[] | null;
  is_staff_reply: boolean;
  created_at: string;
  // Joined
  sender?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined
  actor?: Profile;
}

// ── UI Utility Types ──
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popularity' | 'rating';
  page?: number;
  pageSize?: number;
}

export interface CheckoutState {
  step: 1 | 2 | 3 | 4 | 5;
  cartItems: CartItem[];
  selectedAddress: Address | null;
  newAddress: Partial<Address> | null;
  deliveryMethod: DeliveryMethod | null;
  couponCode: string;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  idempotencyKey: string;
}
