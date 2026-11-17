import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
