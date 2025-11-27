import { PORT, JWT_SECRET } from './config/env.js';
import app from './app.js';

const port = PORT || 3001;

console.log('JWT_SECRET loaded:', JWT_SECRET);

app.listen(port, () => {
  console.log(`✅ Customers API listening on port ${port}`);
});
