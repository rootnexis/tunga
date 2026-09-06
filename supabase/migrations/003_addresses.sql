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
