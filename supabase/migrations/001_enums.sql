-- ============================================================
-- MIGRATION 001: Core Enum Types
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'customer',
  'staff',
  'manager',
  'admin',
  'super_admin'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'payment_processing',
  'paid',
  'processing',
  'ready_for_shipment',
  'shipped',
  'out_for_delivery',
  'delivered',
  'payment_failed',
  'cancelled',
  'return_requested',
  'returned',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'successful',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'waiting_for_customer',
  'resolved',
  'closed'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email',
  'sms'
);
