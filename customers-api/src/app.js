import express from 'express';
import healthRouter from './routes/health.route.js';
import customerRouter from './routes/customer.route.js';
import authRouter from './routes/auth.route.js';
import internalCustomerRouter from './routes/internalCustomer.route.js';

const app = express();

app.use(express.json());

// Rutas publicas
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/customers', customerRouter);

// Rutas internas para validaciones entre servicios
app.use('/internal/customers', internalCustomerRouter);

// Validacion 404
app.use((req, res, next) => {
  res.status(404).json({
    error: { message: 'Not Found' },
  });
});

// Errores
app.use((err, req, res, next) => {
  console.error('❌ [customers-api] Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: { message },
  });
});

export default app;
