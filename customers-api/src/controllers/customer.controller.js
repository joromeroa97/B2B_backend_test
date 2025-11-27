import { query } from '../db/pool.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from '../schemas/customer.schema.js';

// POST /customers
export async function createCustomer(req, res, next) {
  try {
    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.message } });
    }

    const { name, email, phone } = value;

    // Insert en DB
    const result = await query(
      `INSERT INTO customers (name, email, phone, created_at)
       VALUES (?, ?, ?, NOW())`,
      [name, email, phone || null]
    );

    const customerId = result.insertId;

    const [customer] = await query(
      `SELECT id, name, email, phone, created_at
       FROM customers
       WHERE id = ?`,
      [customerId]
    );

    return res.status(201).json({ data: customer });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { message: 'Email already exists' },
      });
    }
    next(err);
  }
}

// GET /customers/:id
export async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT id, name, email, phone, created_at
       FROM customers
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Customer not found' },
      });
    }

    return res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /customers
export async function listCustomers(req, res, next) {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT id, name, email, phone, created_at
      FROM customers
      WHERE deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ?)`;
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

// PUT /customers/:id
export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { error, value } = updateCustomerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: { message: error.message } });
    }

    // Verificar que exista
    const existing = await query(
      `SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Customer not found' } });
    }

    const fields = [];
    const params = [];

    if (value.name !== undefined) {
      fields.push('name = ?');
      params.push(value.name);
    }
    if (value.email !== undefined) {
      fields.push('email = ?');
      params.push(value.email);
    }
    if (value.phone !== undefined) {
      fields.push('phone = ?');
      params.push(value.phone || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        error: { message: 'No fields to update' },
      });
    }

    params.push(id);

    await query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await query(
      `SELECT id, name, email, phone, created_at
       FROM customers
       WHERE id = ?`,
      [id]
    );

    return res.json({ data: updated });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { message: 'Email already exists' },
      });
    }
    next(err);
  }
}

// DELETE /customers/:id (soft delete)
export async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE customers
       SET deleted_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: { message: 'Customer not found or already deleted' },
      });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
