import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import noteRoutes from './routes/note.routes';
import adminRoutes from './routes/admin.routes';
import postRoutes from './routes/post.routes';

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
