import 'dotenv/config';
import { z } from 'zod';

/**
 * The API refuses to boot with a missing or malformed environment.
 * Fail fast at startup beats a 500 at 2am.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/kotha'),

  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me-please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  ADMIN_INVITE_CODE: z.string().min(8).default('KOTHA-GRITFEAT-2026'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Kotha Studio <no-reply@kotha.studio>'),

  KHALTI_SECRET_KEY: z.string().optional().default(''),
  KHALTI_BASE_URL: z.string().url().default('https://dev.khalti.com/api/v2'),
  KHALTI_RETURN_URL: z.string().url().default('http://localhost:5173/checkout/return'),
  KHALTI_WEBSITE_URL: z.string().url().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(
  (v, i, a) => a.indexOf(v) === i,
);

export const mailEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
export const khaltiEnabled = Boolean(env.KHALTI_SECRET_KEY);
