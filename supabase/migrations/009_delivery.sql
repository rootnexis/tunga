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
