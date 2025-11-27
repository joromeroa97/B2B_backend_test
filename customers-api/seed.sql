
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE customers;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO customers (name, email, phone)
VALUES
  ('Empresa Patito S.A.',            'contacto@empresa-patito.com', '+593999000001'),
  ('Distribuidora DeTodo Ltda.', 'ventas@detodo.com',            '+593999000002'),
  ('Servicios Globales S.A.',         'info@globales.com',            '+593999000003'),
  ('Tecnología del Futuro S.A.',    'soporte@tec-futuro.com',     '+593999000004');
