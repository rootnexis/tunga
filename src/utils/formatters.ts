import type { OrderStatus, PaymentStatus, TicketStatus } from '@/types';

// ── Currency formatting ──
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date formatting ──
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options ?? { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(d);
}

// ── Order status display ──
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  payment_processing: 'Processing Payment',
  paid: 'Paid',
  processing: 'Processing',
  ready_for_shipment: 'Ready for Shipment',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  payment_failed: 'Payment Failed',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'badge-neutral',
  payment_processing: 'badge-info',
  paid: 'badge-primary',
  processing: 'badge-primary',
  ready_for_shipment: 'badge-violet',
  shipped: 'badge-violet',
  out_for_delivery: 'badge-warning',
  delivered: 'badge-success',
  payment_failed: 'badge-danger',
  cancelled: 'badge-danger',
  return_requested: 'badge-warning',
  returned: 'badge-neutral',
  refunded: 'badge-neutral',
};

// ── Payment status display ──
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  successful: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'badge-neutral',
  processing: 'badge-info',
  successful: 'badge-success',
  failed: 'badge-danger',
  cancelled: 'badge-danger',
  refunded: 'badge-neutral',
  partially_refunded: 'badge-warning',
};

// ── Ticket status display ──
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_customer: 'Waiting for You',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'badge-danger',
  in_progress: 'badge-primary',
  waiting_for_customer: 'badge-warning',
  resolved: 'badge-success',
  closed: 'badge-neutral',
};

// ── Discount calculation ──
export function calculateDiscount(basePrice: number, salePrice: number | null): number {
  if (!salePrice || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

export function getEffectivePrice(product: { base_price: number; sale_price: number | null }): number {
  return product.sale_price ?? product.base_price;
}

// ── Address formatting ──
export function formatAddress(address: {
  first_name?: string;
  last_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
}): string {
  const parts = [
    [address.first_name, address.last_name].filter(Boolean).join(' '),
    address.address_line1,
    address.address_line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  return parts.join('\n');
}

// ── Slugify ──
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Truncate text ──
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

// ── Generate idempotency key ──
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Class name utility ──
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Pluralize ──
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ── Stock status ──
export function getStockStatus(qty: number, threshold: number = 5): 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
}
