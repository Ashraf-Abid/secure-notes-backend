import { Server } from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';

const TEST_DB = 'secure-notes-test';
const PASSWORD = 'password123';

let server: Server;
let baseUrl: string;
let seq = 0;

export async function startTestApp() {
  await mongoose.connect(env.mongoUri, { family: 4, dbName: TEST_DB });
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(`Refusing to run tests against database "${mongoose.connection.name}"`);
  }
  await mongoose.connection.dropDatabase();
  await mongoose.syncIndexes();

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

export async function stopTestApp() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

export async function api(method: string, path: string, options: { body?: unknown; token?: string } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

export async function createUser(options: { role?: 'USER' | 'ADMIN'; name?: string; interests?: string[] } = {}) {
  seq++;
  const email = `user${seq}@test.com`;
  const res = await api('POST', '/auth/register', {
    body: { name: options.name ?? `User ${seq}`, email, password: PASSWORD, interests: options.interests },
  });
  if (res.status !== 201) throw new Error(`createUser failed: ${JSON.stringify(res.body)}`);

  if (options.role === 'ADMIN') {
    await User.updateOne({ email }, { role: 'ADMIN' });
  }
  return { id: res.body.data.user._id as string, token: res.body.data.token as string, email, password: PASSWORD };
}
