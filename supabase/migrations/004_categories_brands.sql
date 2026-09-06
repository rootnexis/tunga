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
