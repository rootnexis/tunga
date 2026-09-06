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
-- ============================================================
-- MIGRATION 002: Profiles
-- Extends auth.users with application-level user data
-- ============================================================

CREATE TABLE profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role   NOT NULL DEFAULT 'customer',
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on auth.users INSERT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get caller's role (safe, security definer)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-role escalation
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Staff+ can view all profiles
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

-- Super admin can update any profile (including roles)
CREATE POLICY "Super admin can manage all profiles"
  ON profiles FOR ALL
  USING (get_my_role() = 'super_admin');

-- Index
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
-- ============================================================
-- MIGRATION 003: Addresses
-- ============================================================

CREATE TABLE addresses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label           text,
  first_name      text        NOT NULL,
  last_name       text        NOT NULL,
  phone           text,
  address_line1   text        NOT NULL,
  address_line2   text,
  city            text        NOT NULL,
  state           text,
  postal_code     text,
  country         text        NOT NULL,
  is_default      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ensure only one default address per user
CREATE UNIQUE INDEX idx_addresses_default_per_user
  ON addresses(user_id)
  WHERE is_default = true;

-- When setting new default, clear existing default via trigger
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses
      SET is_default = false
      WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_set_default_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own addresses"
  ON addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all addresses"
  ON addresses FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

-- Indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
-- ============================================================
-- MIGRATION 004: Categories & Brands
-- ============================================================

-- ── Categories (hierarchical) ──
CREATE TABLE categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        REFERENCES categories(id) ON DELETE SET NULL,
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  description text,
  image_url   text,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active categories
CREATE POLICY "Public read active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Manager+ can manage categories
CREATE POLICY "Manager+ manage categories"
  ON categories FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- ── Brands ──
CREATE TABLE brands (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  logo_url    text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active brands"
  ON brands FOR SELECT
  USING (is_active = true);

CREATE POLICY "Manager+ manage brands"
  ON brands FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE INDEX idx_brands_slug ON brands(slug);
-- ============================================================
-- MIGRATION 005: Products, Variants, Images
-- ============================================================

-- ── Products ──
CREATE TABLE products (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid          REFERENCES categories(id) ON DELETE SET NULL,
  brand_id            uuid          REFERENCES brands(id) ON DELETE SET NULL,
  name                text          NOT NULL,
  slug                text          NOT NULL UNIQUE,
  description         text,
  short_description   text,
  sku                 text          NOT NULL UNIQUE,
  base_price          numeric(12,2) NOT NULL CHECK (base_price >= 0),
  sale_price          numeric(12,2)           CHECK (sale_price IS NULL OR sale_price >= 0),
  currency            text          NOT NULL DEFAULT 'USD',
  weight_kg           numeric(8,3),
  dimensions_cm       jsonb,           -- {l, w, h}
  specifications      jsonb,           -- {key: value, ...}
  tags                text[]        NOT NULL DEFAULT '{}',
  is_active           boolean       NOT NULL DEFAULT true,
  is_featured         boolean       NOT NULL DEFAULT false,
  is_archived         boolean       NOT NULL DEFAULT false,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT sale_price_less_than_base
    CHECK (sale_price IS NULL OR sale_price < base_price)
);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Full-text search vector
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B')
  ) STORED;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active non-archived products"
  ON products FOR SELECT
  USING (is_active = true AND is_archived = false);

-- Staff can see all products (including inactive/archived for management)
CREATE POLICY "Staff read all products"
  ON products FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

CREATE POLICY "Manager+ manage products"
  ON products FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- Indexes
CREATE INDEX idx_products_slug          ON products(slug);
CREATE INDEX idx_products_category_id   ON products(category_id);
CREATE INDEX idx_products_brand_id      ON products(brand_id);
CREATE INDEX idx_products_is_active     ON products(is_active);
CREATE INDEX idx_products_is_featured   ON products(is_featured);
CREATE INDEX idx_products_base_price    ON products(base_price);
CREATE INDEX idx_products_tags          ON products USING GIN(tags);
CREATE INDEX idx_products_search        ON products USING GIN(search_vector);

-- ── Product Variants ──
CREATE TABLE product_variants (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name            text          NOT NULL,
  sku             text          NOT NULL UNIQUE,
  attributes      jsonb         NOT NULL DEFAULT '{}',  -- {color: 'Red', size: 'XL'}
  price_modifier  numeric(12,2) NOT NULL DEFAULT 0,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active variants of active products"
  ON product_variants FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.is_archived = false
    )
  );

CREATE POLICY "Staff read all variants"
  ON product_variants FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

CREATE POLICY "Manager+ manage variants"
  ON product_variants FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE INDEX idx_variants_product_id ON product_variants(product_id);

-- ── Product Images ──
CREATE TABLE product_images (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    uuid        REFERENCES product_variants(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  url           text        NOT NULL,
  alt_text      text,
  sort_order    int         NOT NULL DEFAULT 0,
  is_primary    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only one primary image per product (not per variant)
CREATE UNIQUE INDEX idx_product_images_primary_per_product
  ON product_images(product_id)
  WHERE is_primary = true AND variant_id IS NULL;

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.is_archived = false
    )
  );

CREATE POLICY "Staff read all images"
  ON product_images FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

CREATE POLICY "Manager+ manage images"
  ON product_images FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE INDEX idx_images_product_id  ON product_images(product_id);
CREATE INDEX idx_images_variant_id  ON product_images(variant_id);
CREATE INDEX idx_images_sort_order  ON product_images(product_id, sort_order);

-- ── Search Function ──
CREATE OR REPLACE FUNCTION search_products(
  search_query   text,
  p_category_id  uuid    DEFAULT NULL,
  p_brand_id     uuid    DEFAULT NULL,
  p_min_price    numeric DEFAULT NULL,
  p_max_price    numeric DEFAULT NULL,
  p_in_stock     boolean DEFAULT NULL,
  p_page         int     DEFAULT 1,
  p_page_size    int     DEFAULT 24
)
RETURNS TABLE(
  id uuid, name text, slug text, base_price numeric, sale_price numeric,
  currency text, is_featured boolean, category_id uuid, brand_id uuid, tags text[],
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT p.*, COUNT(*) OVER() AS total_count
    FROM products p
    WHERE p.is_active = true
      AND p.is_archived = false
      AND (search_query IS NULL OR search_query = '' OR p.search_vector @@ plainto_tsquery('english', search_query))
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND (p_min_price IS NULL OR COALESCE(p.sale_price, p.base_price) >= p_min_price)
      AND (p_max_price IS NULL OR COALESCE(p.sale_price, p.base_price) <= p_max_price)
      AND (
        p_in_stock IS NULL
        OR NOT p_in_stock
        OR EXISTS (
          SELECT 1 FROM inventory i
          WHERE i.product_id = p.id
            AND i.quantity_available > 0
        )
      )
    ORDER BY
      CASE WHEN search_query IS NOT NULL AND search_query != ''
        THEN ts_rank(p.search_vector, plainto_tsquery('english', search_query))
        ELSE 0
      END DESC,
      p.is_featured DESC,
      p.created_at DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size
  )
  SELECT id, name, slug, base_price, sale_price, currency, is_featured,
         category_id, brand_id, tags, total_count
  FROM filtered;
$$;
-- ============================================================
-- MIGRATION 006: Inventory & Inventory Movements
-- ============================================================

CREATE TABLE inventory (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id            uuid        REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity_available    int         NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved     int         NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  low_stock_threshold   int         NOT NULL DEFAULT 5,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, variant_id)
);

-- Auto-create inventory row when product is created
CREATE OR REPLACE FUNCTION create_inventory_for_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory (product_id, variant_id)
  VALUES (NEW.id, NULL)
  ON CONFLICT (product_id, variant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_created_create_inventory
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION create_inventory_for_product();

-- Auto-create inventory row when variant is created
CREATE OR REPLACE FUNCTION create_inventory_for_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory (product_id, variant_id)
  VALUES (NEW.product_id, NEW.id)
  ON CONFLICT (product_id, variant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_variant_created_create_inventory
  AFTER INSERT ON product_variants
  FOR EACH ROW EXECUTE FUNCTION create_inventory_for_variant();

-- ── Inventory Movements (Audit Trail) ──
CREATE TABLE inventory_movements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id    uuid        NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  actor_id        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  movement_type   text        NOT NULL,  -- 'purchase','adjustment','restock','return','reservation','release'
  quantity_change int         NOT NULL,
  quantity_after  int         NOT NULL,
  reference_id    uuid,                  -- order_id, adjustment_id, etc.
  reference_type  text,                  -- 'order', 'manual_adjustment', etc.
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Safe inventory deduction (with lock) ──
-- Called by Edge Functions during order creation
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_product_id   uuid,
  p_variant_id   uuid,
  p_quantity     int,
  p_order_id     uuid,
  p_actor_id     uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory_id   uuid;
  v_available      int;
  v_after          int;
BEGIN
  -- Lock the inventory row for this transaction
  SELECT id, quantity_available
    INTO v_inventory_id, v_available
    FROM inventory
   WHERE product_id = p_product_id
     AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_available < p_quantity THEN
    RETURN false;
  END IF;

  v_after := v_available - p_quantity;

  UPDATE inventory
     SET quantity_available = v_after,
         quantity_reserved  = quantity_reserved + p_quantity,
         updated_at         = now()
   WHERE id = v_inventory_id;

  INSERT INTO inventory_movements (
    inventory_id, actor_id, movement_type,
    quantity_change, quantity_after,
    reference_id, reference_type, note
  ) VALUES (
    v_inventory_id, p_actor_id, 'reservation',
    -p_quantity, v_after,
    p_order_id, 'order', 'Reserved for order'
  );

  RETURN true;
END;
$$;

-- ── Release reservation (e.g., on order cancellation) ──
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_product_id  uuid,
  p_variant_id  uuid,
  p_quantity    int,
  p_order_id    uuid,
  p_actor_id    uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory_id uuid;
  v_after        int;
BEGIN
  SELECT id, quantity_available
    INTO v_inventory_id, v_after
    FROM inventory
   WHERE product_id = p_product_id
     AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
   FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  v_after := v_after + p_quantity;

  UPDATE inventory
     SET quantity_available = v_after,
         quantity_reserved  = GREATEST(0, quantity_reserved - p_quantity),
         updated_at         = now()
   WHERE id = v_inventory_id;

  INSERT INTO inventory_movements (
    inventory_id, actor_id, movement_type,
    quantity_change, quantity_after,
    reference_id, reference_type, note
  ) VALUES (
    v_inventory_id, p_actor_id, 'release',
    p_quantity, v_after,
    p_order_id, 'order', 'Released from cancelled order'
  );
END;
$$;

-- RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read inventory"
  ON inventory FOR SELECT
  USING (true);

CREATE POLICY "Staff+ manage inventory"
  ON inventory FOR ALL
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff+ read inventory movements"
  ON inventory_movements FOR SELECT
  USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

CREATE POLICY "System insert movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));

-- Indexes
CREATE INDEX idx_inventory_product_id    ON inventory(product_id);
CREATE INDEX idx_inventory_variant_id    ON inventory(variant_id);
CREATE INDEX idx_inv_mov_inventory_id    ON inventory_movements(inventory_id);
CREATE INDEX idx_inv_mov_created_at      ON inventory_movements(created_at DESC);
-- ============================================================
-- MIGRATION 007: Carts & Wishlists
-- ============================================================

-- ── Carts ──
CREATE TABLE carts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  text        UNIQUE,  -- for guest carts (future)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_owner_check CHECK (
    (user_id IS NOT NULL) != (session_id IS NOT NULL)  -- must have exactly one
    OR user_id IS NOT NULL  -- user carts always valid
  )
);

CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE cart_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     uuid        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  uuid        REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    int         NOT NULL CHECK (quantity > 0),
  added_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_id)
);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own cart"
  ON carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_cart_items_cart_id    ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- ── Wishlists ──
CREATE TABLE wishlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Auto-create wishlist on profile creation
CREATE OR REPLACE FUNCTION create_wishlist_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wishlists (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wishlist
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_wishlist_for_user();

CREATE TABLE wishlist_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id   uuid        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id    uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wishlist_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own wishlist items"
  ON wishlist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wishlists w
      WHERE w.id = wishlist_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlists w
      WHERE w.id = wishlist_id
        AND w.user_id = auth.uid()
    )
  );

CREATE INDEX idx_wishlist_items_wishlist_id  ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id   ON wishlist_items(product_id);
-- ============================================================
-- MIGRATION 008: Coupons
-- ============================================================

CREATE TABLE coupons (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    text          NOT NULL UNIQUE,
  type                    text          NOT NULL CHECK (type IN ('percentage','fixed','free_shipping')),
  value                   numeric(12,2) NOT NULL CHECK (value > 0),
  min_order_amount        numeric(12,2),
  max_discount_amount     numeric(12,2),
  applicable_to           text          NOT NULL DEFAULT 'all' CHECK (applicable_to IN ('all','category','product')),
  applicable_ids          uuid[]        NOT NULL DEFAULT '{}',
  max_uses                int,
  max_uses_per_customer   int           NOT NULL DEFAULT 1,
  used_count              int           NOT NULL DEFAULT 0,
  starts_at               timestamptz,
  expires_at              timestamptz,
  is_active               boolean       NOT NULL DEFAULT true,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE coupon_uses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   uuid        NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    uuid        NOT NULL,  -- FK added after orders table created
  used_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read active coupons (to check validity)
CREATE POLICY "Authenticated read active coupons"
  ON coupons FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Manager+ manage coupons"
  ON coupons FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Users read their own coupon uses"
  ON coupon_uses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System insert coupon uses"
  ON coupon_uses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coupons_code       ON coupons(code);
CREATE INDEX idx_coupons_is_active  ON coupons(is_active);
CREATE INDEX idx_coupon_uses_user   ON coupon_uses(user_id);
CREATE INDEX idx_coupon_uses_coupon ON coupon_uses(coupon_id);
-- ============================================================
-- MIGRATION 009: Delivery Zones & Methods
-- ============================================================

CREATE TABLE delivery_zones (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  countries   text[]  NOT NULL DEFAULT '{}',
  regions     text[]  NOT NULL DEFAULT '{}'
);

CREATE TABLE delivery_methods (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id               uuid          REFERENCES delivery_zones(id) ON DELETE SET NULL,
  name                  text          NOT NULL,
  description           text,
  estimated_days_min    int,
  estimated_days_max    int,
  base_fee              numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_fee >= 0),
  free_above_amount     numeric(12,2),
  is_active             boolean       NOT NULL DEFAULT true,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER set_delivery_methods_updated_at
  BEFORE UPDATE ON delivery_methods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;

-- Everyone can read delivery methods (shown at checkout)
CREATE POLICY "Public read delivery zones"
  ON delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "Public read active delivery methods"
  ON delivery_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Manager+ manage delivery zones"
  ON delivery_zones FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Manager+ manage delivery methods"
  ON delivery_methods FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE INDEX idx_delivery_methods_zone_id    ON delivery_methods(zone_id);
CREATE INDEX idx_delivery_methods_is_active  ON delivery_methods(is_active);
-- ============================================================
-- MIGRATION 010: Orders, Payments & Shipments
-- ============================================================

-- ── Helper: auto-generate a short, human-readable order number ────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10000 INCREMENT 1;

-- ── orders ────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          text            NOT NULL UNIQUE DEFAULT 'ORD-' || nextval('order_number_seq')::text,
  user_id               uuid            NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status                order_status    NOT NULL DEFAULT 'pending',
  subtotal              numeric(12,2)   NOT NULL CHECK (subtotal >= 0),
  discount_amount       numeric(12,2)   NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_fee          numeric(12,2)   NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  tax_amount            numeric(12,2)   NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total                 numeric(12,2)   NOT NULL CHECK (total >= 0),
  currency              text            NOT NULL DEFAULT 'USD',
  coupon_id             uuid            REFERENCES coupons(id) ON DELETE SET NULL,
  delivery_method_id    uuid            REFERENCES delivery_methods(id) ON DELETE SET NULL,
  -- Snapshot of address at time of order (JSONB so the address can change later)
  shipping_address      jsonb           NOT NULL,
  billing_address       jsonb,
  notes                 text,
  idempotency_key       text            UNIQUE,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── order_items ───────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        uuid            REFERENCES products(id) ON DELETE SET NULL,
  variant_id        uuid            REFERENCES product_variants(id) ON DELETE SET NULL,
  -- Snapshot columns (preserved even if product is deleted/changed)
  product_name      text            NOT NULL,
  variant_name      text,
  sku               text            NOT NULL DEFAULT '',
  unit_price        numeric(12,2)   NOT NULL CHECK (unit_price >= 0),
  quantity          int             NOT NULL CHECK (quantity > 0),
  discount_amount   numeric(12,2)   NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total        numeric(12,2)   NOT NULL CHECK (line_total >= 0),
  created_at        timestamptz     NOT NULL DEFAULT now()
);

-- ── order_status_history ──────────────────────────────────────────────────
CREATE TABLE order_status_history (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status   order_status,
  to_status     order_status    NOT NULL,
  actor_id      uuid            REFERENCES profiles(id) ON DELETE SET NULL,
  note          text,
  created_at    timestamptz     NOT NULL DEFAULT now()
);

-- ── payments ──────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider              text            NOT NULL DEFAULT 'manual',   -- 'stripe', 'paypal', etc.
  provider_payment_id   text,
  provider_session_id   text,
  amount                numeric(12,2)   NOT NULL CHECK (amount >= 0),
  currency              text            NOT NULL DEFAULT 'USD',
  status                payment_status  NOT NULL DEFAULT 'pending',
  metadata              jsonb,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── shipments ─────────────────────────────────────────────────────────────
CREATE TABLE shipments (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number           text,
  carrier                   text,
  estimated_delivery_date   date,
  actual_delivery_date      date,
  status                    text        NOT NULL DEFAULT 'pending',
  tracking_url              text,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Retroactive FK on coupon_uses ─────────────────────────────────────────
-- coupon_uses.order_id was left as a bare uuid in 008; now we can add the FK.
ALTER TABLE coupon_uses
  ADD CONSTRAINT coupon_uses_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- ── Trigger: auto-increment coupon used_count when a coupon_use is inserted ──
CREATE OR REPLACE FUNCTION increment_coupon_used_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_coupon_used_count
  AFTER INSERT ON coupon_uses
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_used_count();

-- ── Trigger: auto-insert initial status history row on order creation ─────
CREATE OR REPLACE FUNCTION record_initial_order_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, actor_id)
  VALUES (NEW.id, NULL, NEW.status, NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_initial_status
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION record_initial_order_status();

-- ── Trigger: auto-insert history row on status change ────────────────────
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_change();

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments             ENABLE ROW LEVEL SECURITY;

-- orders --
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Manager+ read all orders"
  ON orders FOR SELECT
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Manager+ manage all orders"
  ON orders FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- order_items --
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Users insert order items for own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Manager+ manage order items"
  ON order_items FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- order_status_history --
CREATE POLICY "Users read own order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Manager+ manage order history"
  ON order_status_history FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- payments --
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Manager+ manage payments"
  ON payments FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- shipments --
CREATE POLICY "Users read own shipments"
  ON shipments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Manager+ manage shipments"
  ON shipments FOR ALL
  USING (get_my_role() IN ('manager', 'admin', 'super_admin'));

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_orders_user_id          ON orders(user_id);
CREATE INDEX idx_orders_status           ON orders(status);
CREATE INDEX idx_orders_created_at       ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number     ON orders(order_number);
CREATE INDEX idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX idx_order_history_order_id  ON order_status_history(order_id);
CREATE INDEX idx_payments_order_id       ON payments(order_id);
CREATE INDEX idx_shipments_order_id      ON shipments(order_id);
-- ============================================================
-- MIGRATION 011: Seed Data & Admin Setup
-- Run this in Supabase SQL Editor to populate sample data
-- ============================================================

-- ── 1. Create Storage Bucket for Product Images (if not exists) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for product images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public product images access'
  ) THEN
    CREATE POLICY "Public product images access" ON storage.objects
      FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload product images'
  ) THEN
    CREATE POLICY "Authenticated users can upload product images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

-- ── 2. Seed Categories ──
INSERT INTO categories (id, name, slug, description, sort_order, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Audio & Sound', 'audio-sound', 'Headphones, earbuds, and premium audio equipment', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Wearables', 'wearables', 'Smartwatches, fitness bands, and wearable tech', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'Accessories', 'accessories', 'Chargers, stands, cables, and premium carrying cases', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Smart Home', 'smart-home', 'Connected devices, ambient lights, and smart hubs', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Seed Brands ──
INSERT INTO brands (id, name, slug, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'NovaSound', 'novasound', true),
  ('b0000000-0000-0000-0000-000000000002', 'ApexGear', 'apexgear', true),
  ('b0000000-0000-0000-0000-000000000003', 'LuminaTech', 'luminatech', true),
  ('b0000000-0000-0000-0000-000000000004', 'AuraDesign', 'auradesign', true)
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Seed Products ──
-- Note: Trigger 'on_product_created_create_inventory' will auto-insert default inventory records.
INSERT INTO products (
  id, category_id, brand_id, name, slug, sku,
  short_description, description, base_price, sale_price, currency,
  tags, is_active, is_featured, is_archived
)
VALUES
  (
    'p0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'NovaSound Pro Wireless Headphones',
    'novasound-pro-wireless-headphones',
    'NS-WH-001',
    'Active noise cancelling headphones with 40-hour battery life and spatial audio.',
    'Engineered for true audiophiles. Features ultra-responsive 45mm neodymium drivers, hybrid active noise cancellation, memory foam earcups, and crystal-clear call quality.',
    299.99,
    249.99,
    'USD',
    ARRAY['wireless', 'noise-cancelling', 'bluetooth', 'audio'],
    true,
    true,
    false
  ),
  (
    'p0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Apex Chrono Smartwatch Ultra',
    'apex-chrono-smartwatch-ultra',
    'AG-SW-002',
    'Titanium bezel smartwatch with biometric tracking and always-on OLED display.',
    'Rugged yet refined. Tracks heart rate, blood oxygen, sleep quality, and GPS routes with up to 14 days of battery longevity.',
    399.00,
    349.00,
    'USD',
    ARRAY['smartwatch', 'fitness', 'titanium', 'wearables'],
    true,
    true,
    false
  ),
  (
    'p0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'Aura Magnetic Wireless Power Bank',
    'aura-magnetic-wireless-power-bank',
    'AD-PB-003',
    '10,000mAh snap-on magnetic fast charger with aluminum casing.',
    'Ultra-slim, aircraft-grade aluminum power bank that snaps onto your smartphone with strong magnetic alignment and 15W wireless charging.',
    79.99,
    NULL,
    'USD',
    ARRAY['charging', 'powerbank', 'magsafe', 'accessories'],
    true,
    false,
    false
  ),
  (
    'p0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'Lumina Flow Ambient Light Bar',
    'lumina-flow-ambient-light-bar',
    'LT-LB-004',
    'Smart RGBIC dynamic monitor and room light bar with audio sync.',
    'Enhance your workspace or entertainment setup with 16 million colors, customizable gradient transitions, and seamless voice assistant compatibility.',
    119.00,
    99.00,
    'USD',
    ARRAY['lighting', 'smarthome', 'rgb', 'desk-setup'],
    true,
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Product Images ──
INSERT INTO product_images (product_id, storage_path, url, alt_text, sort_order, is_primary)
VALUES
  (
    'p0000000-0000-0000-0000-000000000001',
    'seed/headphones.jpg',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    'NovaSound Pro Wireless Headphones',
    0,
    true
  ),
  (
    'p0000000-0000-0000-0000-000000000002',
    'seed/smartwatch.jpg',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    'Apex Chrono Smartwatch Ultra',
    0,
    true
  ),
  (
    'p0000000-0000-0000-0000-000000000003',
    'seed/powerbank.jpg',
    'https://images.unsplash.com/photo-1609592807908-62a2fa84b80b?w=800&q=80',
    'Aura Magnetic Wireless Power Bank',
    0,
    true
  ),
  (
    'p0000000-0000-0000-0000-000000000004',
    'seed/lightbar.jpg',
    'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80',
    'Lumina Flow Ambient Light Bar',
    0,
    true
  )
ON CONFLICT DO NOTHING;

-- ── 6. Update Initial Inventory Quantities ──
UPDATE inventory
SET quantity_available = 45, low_stock_threshold = 5
WHERE product_id = 'p0000000-0000-0000-0000-000000000001';

UPDATE inventory
SET quantity_available = 20, low_stock_threshold = 5
WHERE product_id = 'p0000000-0000-0000-0000-000000000002';

UPDATE inventory
SET quantity_available = 8, low_stock_threshold = 10
WHERE product_id = 'p0000000-0000-0000-0000-000000000003';

UPDATE inventory
SET quantity_available = 3, low_stock_threshold = 5
WHERE product_id = 'p0000000-0000-0000-0000-000000000004';

-- ── 7. Seed Delivery Zones & Methods ──
INSERT INTO delivery_zones (id, name, countries, regions)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Domestic / Standard Zone', ARRAY['US', 'MA', 'FR', 'GB'], ARRAY['Domestic'])
ON CONFLICT DO NOTHING;

INSERT INTO delivery_methods (zone_id, name, description, estimated_days_min, estimated_days_max, base_fee, free_above_amount, is_active)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Standard Shipping', 'Tracked road delivery to your doorstep', 3, 5, 4.99, 75.00, true),
  ('d0000000-0000-0000-0000-000000000001', 'Express Priority', 'Expedited courier delivery with live GPS updates', 1, 2, 12.99, 150.00, true),
  ('d0000000-0000-0000-0000-000000000001', 'Free Economy Shipping', 'Standard delivery on qualifying orders above $75', 5, 7, 0.00, 75.00, true)
ON CONFLICT DO NOTHING;

-- ── 8. Seed Coupons ──
INSERT INTO coupons (code, type, value, min_order_amount, max_discount_amount, applicable_to, max_uses, is_active)
VALUES
  ('WELCOME10', 'percentage', 10.00, 50.00, 30.00, 'all', 500, true),
  ('SAVE25', 'fixed', 25.00, 150.00, 25.00, 'all', 200, true),
  ('FREESHIP', 'free_shipping', 15.00, 40.00, 15.00, 'all', 1000, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ── HOW TO PROMOTE YOUR USER TO ADMIN ──
-- 1. Register a user in the frontend at /auth/register
--    (e.g., admin@example.com)
-- 2. Run this query in Supabase SQL editor:
--
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE id = (
--      SELECT id FROM auth.users WHERE email = 'admin@example.com'
--    );
--
-- 3. You can now access /admin directly with full permissions!
-- ============================================================
