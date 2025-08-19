import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().transform(Number).default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // JWT & Security
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default(12),

  // Google APIs
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  MCC_CUSTOMER_ID: z.string(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string(),
  YOUTUBE_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // Email
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().transform(Number).default(587),
  SMTP_SECURE: z.string().transform(val => val === 'true').default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@mdmc.fr'),

  // File Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default(10485760), // 10MB

  // Features
  ENABLE_REGISTRATION: z.string().transform(val => val === 'true').default(true),
  ENABLE_GOOGLE_ADS_SYNC: z.string().transform(val => val === 'true').default(true),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().transform(val => val === 'true').default(true),

  // Business Rules
  DEFAULT_CAMPAIGN_PRICE_EUR: z.string().transform(Number).default(200),
  VAT_RATE: z.string().transform(Number).default(0.22),
  CAMPAIGN_DURATION_DAYS: z.string().transform(Number).default(30),
  MAX_CAMPAIGNS_PER_USER: z.string().transform(Number).default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    console.error(error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n'));
    process.exit(1);
  }
  throw error;
}

export { env };