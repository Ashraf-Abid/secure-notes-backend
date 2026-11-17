import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Fail fast at startup if a required variable is missing,
// instead of crashing later in the middle of a request.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: required('MONGODB_URI'),
};
