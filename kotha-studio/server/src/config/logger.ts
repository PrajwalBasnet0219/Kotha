import pino from 'pino';
import { env, isProd, isTest } from './env';

export const logger = pino({
  level: isTest ? 'silent' : isProd ? 'info' : 'debug',
  base: { service: 'kotha-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      '*.password',
      '*.passwordHash',
    ],
    censor: '[redacted]',
  },
  transport:
    !isProd && !isTest
      ? { target: 'pino-pretty', options: { colorize: false, translateTime: 'HH:MM:ss' } }
      : undefined,
});

export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!domain) return '[redacted]';
  return `${name.slice(0, 2)}***@${domain}`;
};

export { env };
