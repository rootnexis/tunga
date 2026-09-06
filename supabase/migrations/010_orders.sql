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
