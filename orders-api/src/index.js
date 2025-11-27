import { PORT } from './config/env.js';
import app from './app.js';

const port = PORT || 3002;

console.log('✅ Orders API starting on port', port);

app.listen(port, () => {
  console.log(`✅ Orders API listening on port ${port}`);
});
