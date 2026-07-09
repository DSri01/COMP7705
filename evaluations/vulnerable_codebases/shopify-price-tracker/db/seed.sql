INSERT INTO products (name, url, target_price) VALUES
  ('Sony WH-1000XM5 Headphones', 'https://example-shop.com/products/sony-wh1000xm5', 280.00),
  ('Apple AirPods Pro 2', 'https://example-shop.com/products/airpods-pro-2', 199.00),
  ('Samsung Galaxy S24 Ultra', 'https://example-shop.com/products/galaxy-s24-ultra', 999.00),
  ('Nintendo Switch OLED', 'https://example-shop.com/products/switch-oled', 299.00),
  ('Dyson V15 Detect Vacuum', 'https://example-shop.com/products/dyson-v15', 549.00);

INSERT INTO price_history (product_id, old_price, new_price, detected_at)
SELECT id, 349.99, 279.99, NOW() - INTERVAL '2 days' FROM products WHERE name LIKE '%Sony%';
INSERT INTO price_history (product_id, old_price, new_price, detected_at)
SELECT id, 249.99, 189.99, NOW() - INTERVAL '1 day' FROM products WHERE name LIKE '%AirPods%';
INSERT INTO price_history (product_id, old_price, new_price, detected_at)
SELECT id, 1199.99, 999.99, NOW() - INTERVAL '6 hours' FROM products WHERE name LIKE '%Galaxy%';

INSERT INTO alerts (product_id, type, threshold)
SELECT id, 'below_threshold', 280.00 FROM products WHERE name LIKE '%Sony%';
INSERT INTO alerts (product_id, type, threshold)
SELECT id, 'price_change', 0 FROM products WHERE name LIKE '%Galaxy%';
