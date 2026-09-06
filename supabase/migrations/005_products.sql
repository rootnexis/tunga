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
