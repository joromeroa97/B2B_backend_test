import { pool, query } from '../db/pool.js';
import { createOrderSchema, listOrdersSchema } from '../schemas/order.schema.js';
import { fetchCustomerById } from '../services/customer.service.js';

// POST /orders
export async function createOrder(req, res, next) {
  const connection = await pool.getConnection();
  try {
    // 1. Validar body
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      connection.release();
      return res.status(400).json({ error: { message: error.message } });
    }

    const { customer_id, items } = value;

    // 2. Validar cliente en Customers API (/internal/customers/:id) ruta interna
    const customer = await fetchCustomerById(customer_id);
    //console.log(`customer ${JSON.stringify(customer)}`); verificar que se obtiene el cliente
    if (!customer) {
      connection.release();
      return res.status(400).json({
        error: { message: 'Customer does not exist' },
      });
    }

    // 3. Empezar transacción
    await connection.beginTransaction();

    // 4. Obtener productos afectados con FOR UPDATE
    const productIds = [...new Set(items.map((it) => it.product_id))];
    const placeholders = productIds.map(() => '?').join(', ');

    const [products] = await connection.query(
      `
      SELECT id, price_cents, stock
      FROM products
      WHERE id IN (${placeholders})
      FOR UPDATE
      `,
      productIds
    );

    if (products.length !== productIds.length) {
      // algún producto no existe
      throw new Error('One or more products do not exist');
    }

    // Mapear productos por id
    const productMap = new Map();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    // 5. Verificar stock y calcular totales
    let total_cents = 0;
    const orderItemsToInsert = [];

    for (const item of items) {
      const prod = productMap.get(item.product_id);
      if (!prod) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      if (prod.stock < item.qty) {
        throw new Error(`Insufficient stock for product ${item.product_id}`);
      }

      const unit_price_cents = prod.price_cents;
      const subtotal_cents = unit_price_cents * item.qty;
      total_cents += subtotal_cents;

      orderItemsToInsert.push({
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents,
        subtotal_cents,
      });
    }

    // 6. Insertar orden
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (customer_id, status, total_cents, created_at)
      VALUES (?, 'CREATED', ?, NOW())
      `,
      [customer_id, total_cents]
    );

    const orderId = orderResult.insertId;

    // 7. Insertar order_items
    for (const item of orderItemsToInsert) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.qty,
          item.unit_price_cents,
          item.subtotal_cents,
        ]
      );
    }

    // 8. Actualizar stock de productos
    for (const item of orderItemsToInsert) {
      await connection.query(
        `
        UPDATE products
        SET stock = stock - ?
        WHERE id = ?
        `,
        [item.qty, item.product_id]
      );
    }

    // 9. Commit
    await connection.commit();
    connection.release();

    // 10. Consultar orden + items para devolver
    const [orderRows] = await pool.query(
      `
      SELECT id, customer_id, status, total_cents, created_at, updated_at
      FROM orders
      WHERE id = ?
      `,
      [orderId]
    );

    const [itemsRows] = await pool.query(
      `
      SELECT oi.id, oi.product_id, p.sku, p.name, oi.qty,
             oi.unit_price_cents, oi.subtotal_cents
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      `,
      [orderId]
    );

    return res.status(201).json({
      data: {
        order: orderRows[0],
        items: itemsRows,
        customer, // info obtenida de Customers API
      },
    });
    } catch (err) {
    console.error('[orders-api] Error en createOrder:', err && err.message ? err.message : err);

    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[orders-api] Error en rollback:', rollbackErr && rollbackErr.message ? rollbackErr.message : rollbackErr);
    }
    connection.release();

    const msg = err && err.message ? String(err.message) : '';

    if (msg.startsWith('Insufficient stock')) {
      return res.status(400).json({ error: { message: msg } });
    }
    if (msg.startsWith('One or more products') || msg.startsWith('Product ')) {
      return res.status(400).json({ error: { message: msg } });
    }

    next(err);
  }

}

// GET /orders/:id
export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    const orders = await query(
      `
      SELECT id, customer_id, status, total_cents, created_at, updated_at
      FROM orders
      WHERE id = ?
      `,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        error: { message: 'Order not found' },
      });
    }

    const items = await query(
      `
      SELECT oi.id, oi.product_id, p.sku, p.name, oi.qty,
             oi.unit_price_cents, oi.subtotal_cents
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      `,
      [id]
    );

    return res.json({
      data: {
        order: orders[0],
        items,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /orders
export async function listOrders(req, res, next) {
  try {
    const { error, value } = listOrdersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: { message: error.message } });
    }

    const { status, from, to, limit, offset } = value;

    let sql = `
      SELECT id, customer_id, status, total_cents, created_at, updated_at
      FROM orders
      WHERE 1 = 1
    `;
    const params = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (from) {
      sql += ` AND created_at >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND created_at <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await query(sql, params);

    return res.json({
      data: rows,
      pagination: {
        limit,
        offset,
        hasMore: rows.length === limit,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /orders/:id/confirm
export async function confirmOrder(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const orderId = Number(req.params.id);
    if (!orderId || Number.isNaN(orderId)) {
      connection.release();
      return res.status(400).json({
        error: { message: 'Invalid order id' },
      });
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      connection.release();
      return res.status(400).json({
        error: { message: 'Idempotency-Key header is required' },
      });
    }

    // 1. Empezar transacción
    await connection.beginTransaction();

    // 2. Verificar si ya existe un registro de idempotencia
    const [existingKeys] = await connection.query(
      `
      SELECT id, status, response_body
      FROM idempotency_keys
      WHERE idempotency_key = ?
      FOR UPDATE
      `,
      [idempotencyKey]
    );

    if (existingKeys.length > 0) {
      const existing = existingKeys[0];
      const status = existing.status;

      if (status === 'PENDING') {
        // Otra confirmación en curso con la misma llave
        await connection.rollback();
        connection.release();
        return res.status(409).json({
          error: { message: 'Idempotent request already in progress' },
        });
      }

      if (status === 'SUCCESS' && existing.response_body) {
        // Ya fue procesado con éxito: devolvemos la misma respuesta
        await connection.commit();
        connection.release();

        let body;
        try {
          body = JSON.parse(existing.response_body);
        } catch (parseErr) {
          console.error('[orders-api] Error parsing stored idempotent response:', parseErr);
          // En el peor caso, respondemos algo genérico
          return res.status(200).json({
            data: {
              order_id: orderId,
              message: 'Order already confirmed (idempotent)',
            },
          });
        }

        return res.status(200).json(body);
      }

    } else {
      // 3. Insertar nueva clave de idempotencia en estado PENDING
      await connection.query(
        `
        INSERT INTO idempotency_keys (
          idempotency_key, target_type, target_id, status, created_at
        ) VALUES (?, 'ORDER_CONFIRMATION', ?, 'PENDING', NOW())
        `,
        [idempotencyKey, orderId]
      );
    }

    // 4. Cargar la orden con FOR UPDATE
    const [orderRows] = await connection.query(
      `
      SELECT id, customer_id, status, total_cents, created_at, updated_at
      FROM orders
      WHERE id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        error: { message: 'Order not found' },
      });
    }

    const order = orderRows[0];

    if (order.status === 'CANCELED') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: { message: 'Cannot confirm a canceled order' },
      });
    }

    if (order.status === 'CONFIRMED') {
      // Orden confirmada: comportamiento idempotente
      const [itemsRows] = await connection.query(
        `
        SELECT oi.id, oi.product_id, p.sku, p.name, oi.qty,
               oi.unit_price_cents, oi.subtotal_cents
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        `,
        [orderId]
      );

      const responseBody = {
        data: {
          order,
          items: itemsRows,
          message: 'Order already confirmed',
        },
      };

      const responseJson = JSON.stringify(responseBody);

      await connection.query(
        `
        UPDATE idempotency_keys
        SET status = 'SUCCESS', response_body = ?
        WHERE idempotency_key = ?
        `,
        [responseJson, idempotencyKey]
      );

      await connection.commit();
      connection.release();

      return res.status(200).json(responseBody);
    }

    // 5. Si está en CREATED, se debe confirmar
    await connection.query(
      `
      UPDATE orders
      SET status = 'CONFIRMED', updated_at = NOW()
      WHERE id = ?
      `,
      [orderId]
    );

    // 6. Cargar items para la respuesta
    const [itemsRows] = await connection.query(
      `
      SELECT oi.id, oi.product_id, p.sku, p.name, oi.qty,
             oi.unit_price_cents, oi.subtotal_cents
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      `,
      [orderId]
    );

    const confirmedOrder = {
      ...order,
      status: 'CONFIRMED',
      updated_at: new Date(),
    };

    const responseBody = {
      data: {
        order: confirmedOrder,
        items: itemsRows,
        message: 'Order confirmed successfully',
      },
    };

    const responseJson = JSON.stringify(responseBody);

    // 7. Actualizar la llave de idempotencia a SUCCESS con la respuesta
    await connection.query(
      `
      UPDATE idempotency_keys
      SET status = 'SUCCESS', response_body = ?
      WHERE idempotency_key = ?
      `,
      [responseJson, idempotencyKey]
    );

    await connection.commit();
    connection.release();

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('[orders-api] Error en confirmOrder:', err && err.message ? err.message : err);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[orders-api] Error en rollback confirmOrder:', rollbackErr && rollbackErr.message ? rollbackErr.message : rollbackErr);
    }
    connection.release();
    next(err);
  }
}


export async function cancelOrder(req, res, next) {
  return res.status(501).json({
    error: { message: 'Service not available, OPTIONAL' },
  });
}
