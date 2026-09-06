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
