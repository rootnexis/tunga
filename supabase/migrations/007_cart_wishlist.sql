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
