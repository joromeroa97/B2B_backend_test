--IMPORTANTE
-- Se asume que ya existen creados customers con IDs 1 y 2 en la tabla customers. Si no, primero asegurarse de haberlos
--creados con los comandos indicados en github README.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE idempotency_keys;

SET FOREIGN_KEY_CHECKS = 1;


INSERT INTO products (sku, name, price_cents, stock)
VALUES
  ('SKU-ABC-001', 'Monitor 24" Full HD',     150000, 50),
  ('SKU-ABC-002', 'Teclado Mecánico RGB',     75000, 80),
  ('SKU-ABC-003', 'Mouse Inalámbrico',        45000, 100),
  ('SKU-ABC-004', 'Docking Station USB-C',   120000, 30);


INSERT INTO orders (customer_id, status, total_cents)
VALUES
  (1, 'CREATED',   270000),
  (2, 'CONFIRMED', 195000);  -- 1x Monitor (150000) + 1x Mouse (45000) = 195000


INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents)
VALUES
  (1, 1, 1, 150000, 150000),  -- Monitor
  (1, 2, 1,  75000,  75000),  -- Teclado
  (1, 3, 1,  45000,  45000);  -- Mouse


INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents)
VALUES
  (2, 1, 1, 150000, 150000),  -- Monitor
  (2, 3, 1,  45000,  45000);  -- Mouse


--  IDEMPOTENCY_KEYS (opcionales de ejemplo)
INSERT INTO idempotency_keys (idempotency_key, target_type, target_id, status, response_body, expires_at)
VALUES
  ('idem-order-1-confirm', 'ORDER_CONFIRMATION', 1, 'PENDING', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('idem-order-2-confirm', 'ORDER_CONFIRMATION', 2, 'SUCCESS', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY));
