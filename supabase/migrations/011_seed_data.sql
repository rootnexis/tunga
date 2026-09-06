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
