CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  target_price DECIMAL(10, 2),
  last_price DECIMAL(10, 2),
  image_url TEXT,
  image_metadata JSONB,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2) NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('below_threshold', 'price_change', 'back_in_stock')),
  threshold DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_products_last_checked ON products(last_checked_at);
CREATE INDEX idx_price_history_product ON price_history(product_id, detected_at DESC);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_sessions_expire ON sessions(expire);

CREATE OR REPLACE FUNCTION scrape_single_product(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Placeholder: actual scraping is done by the Bull queue worker
  UPDATE products SET last_checked_at = NOW() WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
