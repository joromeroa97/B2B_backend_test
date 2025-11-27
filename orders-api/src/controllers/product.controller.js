import { query } from '../db/pool.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../schemas/product.schema.js';

// POST /products
export async function createProduct(req, res, next) {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.message } });
    }

    const { sku, name, price_cents, stock } = value;

    const result = await query(
      `INSERT INTO products (sku, name, price_cents, stock, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [sku, name, price_cents, stock]
    );

    const productId = result.insertId;

    const [product] = await query(
      `SELECT id, sku, name, price_cents, stock, created_at
       FROM products
       WHERE id = ?`,
      [productId]
    );

    return res.status(201).json({ data: product });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { message: 'SKU already exists' },
      });
    }
    next(err);
  }
}

// PATCH /products/:id
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { error, value } = updateProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: { message: error.message } });
    }

    const existing = await query(
      `SELECT id FROM products WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const fields = [];
    const params = [];

    if (value.name !== undefined) {
      fields.push('name = ?');
      params.push(value.name);
    }
    if (value.price_cents !== undefined) {
      fields.push('price_cents = ?');
      params.push(value.price_cents);
    }
    if (value.stock !== undefined) {
      fields.push('stock = ?');
      params.push(value.stock);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        error: { message: 'No fields to update' },
      });
    }

    params.push(id);

    await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await query(
      `SELECT id, sku, name, price_cents, stock, created_at
       FROM products
       WHERE id = ?`,
      [id]
    );

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

// GET /products/:id
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT id, sku, name, price_cents, stock, created_at
       FROM products
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Product not found' },
      });
    }

    return res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /products
export async function listProducts(req, res, next) {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT id, sku, name, price_cents, stock, created_at
      FROM products
      WHERE 1 = 1
    `;
    const params = [];

    if (search) {
      sql += ` AND (name LIKE ? OR sku LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = await query(sql, params);

    return res.json({
      data: rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: rows.length === Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
}
