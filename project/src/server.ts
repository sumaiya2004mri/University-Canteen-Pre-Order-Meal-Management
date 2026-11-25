import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import cartRouter from './routes/cart';
import orderRouter from './routes/order';
import adminRouter from './routes/admin';
import reviewsRouter from './routes/reviews';

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviews', reviewsRouter);

// Simple health check
app.get('/health', (_req, res) => res.send('OK'));
app.get('/api/health', (_req, res) => res.send('OK'));

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
