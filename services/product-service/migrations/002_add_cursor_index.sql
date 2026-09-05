-- Keyset / Cursor-based pagination composite index
CREATE INDEX IF NOT EXISTS idx_products_cursor ON products (created_at DESC, id DESC);
