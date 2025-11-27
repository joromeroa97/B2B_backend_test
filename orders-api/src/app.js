import express from 'express';
import healthRouter from './routes/health.route.js';
import productRouter from './routes/product.route.js';
import orderRouter from './routes/order.route.js';

const app = express();

app.use(express.json());

app.use('/health', healthRouter);
app.use('/products', productRouter);
app.use('/orders', orderRouter);

app.use((req, res, next) => {
  res.status(404).json({
    error: { message: 'Not Found' },
  });
});

app.use((err, req, res, next) => {
  console.error('❌ [orders-api] Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: { message },
  });
});

export default app;
