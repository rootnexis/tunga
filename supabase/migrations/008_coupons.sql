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
