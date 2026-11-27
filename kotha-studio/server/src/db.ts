import mongoose from 'mongoose';
import { env, isTest } from './config/env';
import { logger } from './config/logger';

mongoose.set('strictQuery', true);

export async function connectDb(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  mongoose.connection.on('connected', () => logger.info({ db: mongoose.connection.name }, 'mongo connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongo error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: isTest ? 5000 : 10000,
    maxPoolSize: 10,
    autoIndex: true,
  });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export const isValidId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

export const toId = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
