import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  // Strip filter fields that are not in the schema, so a client can't
  // inject arbitrary query conditions (e.g. { "isAdmin": true }).
  mongoose.set('strictQuery', true);

  // family: 4 forces IPv4. Atlas IP access lists like 0.0.0.0/0 only cover
  // IPv4, so on machines with IPv6 the driver would otherwise connect over
  // IPv6 and be rejected (shows up as "SSL alert number 80").
  await mongoose.connect(env.mongoUri, { family: 4 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
