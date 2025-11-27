import axios from 'axios';
import Joi from 'joi';

const {
  CUSTOMERS_API_BASE = 'http://localhost:3001',
  ORDERS_API_BASE = 'http://localhost:3002',
  SERVICE_TOKEN = 'internal-service-token',
} = process.env;

// Schema de entrada
const orchestratorSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        qty: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  idempotency_key: Joi.string().max(255).required(),
  correlation_id: Joi.string().max(255).optional(),
});

export async function createAndConfirmOrder(event) {
  try {
    // 1. Parsear body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return jsonResponse(400, {
        success: false,
        error: { message: 'Invalid JSON body' },
      });
    }

    // 2. Validar body
    const { error, value } = orchestratorSchema.validate(body);
    if (error) {
      return jsonResponse(400, {
        success: false,
        error: { message: error.message },
      });
    }

    const { customer_id, items, idempotency_key } = value;
    const correlationId =
      value.correlation_id || event.headers?.['x-correlation-id'] || generateCorrelationId();

    // 3. Extraer Authorization (JWT) del request
    const authHeader =
      event.headers?.authorization || event.headers?.Authorization || '';
    const [, jwtToken] = authHeader.split(' ');

    if (!jwtToken) {
      return jsonResponse(401, {
        success: false,
        correlationId,
        error: { message: 'Missing Authorization Bearer token' },
      });
    }

    // 4. Validar cliente en Customers API (endpoint de la ruta interna)
    const customerResp = await axios.get(
      `${CUSTOMERS_API_BASE}/internal/customers/${customer_id}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
        },
        validateStatus: () => true,
      }
    );

    if (customerResp.status === 404) {
      return jsonResponse(400, {
        success: false,
        correlationId,
        error: { message: 'Customer does not exist' },
      });
    }

    if (customerResp.status < 200 || customerResp.status >= 300) {
      return jsonResponse(502, {
        success: false,
        correlationId,
        error: {
          message: 'Error calling Customers API',
          statusCode: customerResp.status,
        },
      });
    }

    const customer = customerResp.data?.data;

    // 5. Crear orden en Orders API
    const createOrderResp = await axios.post(
      `${ORDERS_API_BASE}/orders`,
      { customer_id, items },
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
        validateStatus: () => true,
      }
    );

    if (createOrderResp.status === 400) {
      return jsonResponse(400, {
        success: false,
        correlationId,
        error: createOrderResp.data?.error || { message: 'Invalid order request' },
      });
    }

    if (createOrderResp.status === 401) {
      return jsonResponse(401, {
        success: false,
        correlationId,
        error: { message: 'Unauthorized creating order' },
      });
    }

    if (createOrderResp.status < 200 || createOrderResp.status >= 300) {
      return jsonResponse(502, {
        success: false,
        correlationId,
        error: {
          message: 'Error calling Orders API (create order)',
          statusCode: createOrderResp.status,
        },
      });
    }

    const createdOrder = createOrderResp.data?.data?.order;
    const createdItems = createOrderResp.data?.data?.items || [];

    if (!createdOrder || !createdOrder.id) {
      return jsonResponse(502, {
        success: false,
        correlationId,
        error: { message: 'Orders API did not return a valid order' },
      });
    }

    const orderId = createdOrder.id;

    // 6. Confirmar la orden (idempotente) en Orders API
    const confirmResp = await axios.post(
      `${ORDERS_API_BASE}/orders/${orderId}/confirm`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Idempotency-Key': idempotency_key,
        },
        validateStatus: () => true,
      }
    );

    if (confirmResp.status === 400) {
      return jsonResponse(400, {
        success: false,
        correlationId,
        error: confirmResp.data?.error || { message: 'Cannot confirm order' },
      });
    }

    if (confirmResp.status === 401) {
      return jsonResponse(401, {
        success: false,
        correlationId,
        error: { message: 'Unauthorized confirming order' },
      });
    }

    if (confirmResp.status === 409) {
      // petición idempotente en curso
      return jsonResponse(409, {
        success: false,
        correlationId,
        error: confirmResp.data?.error || { message: 'Idempotent request in progress' },
      });
    }

    if (confirmResp.status < 200 || confirmResp.status >= 300) {
      return jsonResponse(502, {
        success: false,
        correlationId,
        error: {
          message: 'Error calling Orders API (confirm order)',
          statusCode: confirmResp.status,
        },
      });
    }

    const confirmedData = confirmResp.data?.data || {};
    const finalOrder = confirmedData.order || createdOrder;
    const finalItems = confirmedData.items || createdItems;

    // 7. Respuesta consolidada
    return jsonResponse(201, {
      success: true,
      correlationId,
      data: {
        customer,
        order: {
          ...finalOrder,
          items: finalItems,
        },
      },
    });
  } catch (err) {
    console.error('[lambda-orchestrator] Unexpected error:', err);
    return jsonResponse(500, {
      success: false,
      error: { message: 'Internal Orchestrator Error' },
    });
  }
}

// Helpers
function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function generateCorrelationId() {
  return 'corr-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}
