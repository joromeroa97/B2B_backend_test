import axios from 'axios';
import { CUSTOMERS_API_BASE, SERVICE_TOKEN } from '../config/env.js';

if (!CUSTOMERS_API_BASE) {
  console.warn('[orders-api] CUSTOMERS_API_BASE no definido, usando http://localhost:3001');
}

export async function fetchCustomerById(customerId) {
  if (!SERVICE_TOKEN) {
    throw new Error('SERVICE_TOKEN not set in env');
  }

  const baseUrl = CUSTOMERS_API_BASE || 'http://localhost:3001';

  try {
    const resp = await axios.get(
      `${baseUrl}/internal/customers/${customerId}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
        },
        validateStatus: () => true,
      }
    );

    if (resp.status === 404) {
      return null;
    }

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`Customers API error: ${resp.status}`);
    }

    return resp.data.data;
  } catch (err) {
    console.error('[orders-api] Error llamando a Customers API:', err.message);
    throw err;
  }
}
