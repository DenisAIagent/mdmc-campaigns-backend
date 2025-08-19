"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    // Application
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    API_PORT: zod_1.z.string().transform(Number).default('3001'),
    API_BASE_URL: zod_1.z.string().url().default('http://localhost:3001'),
    // Database
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    // JWT & Security
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('12'),
    // Google APIs
    GOOGLE_CLIENT_ID: zod_1.z.string(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string(),
    MCC_CUSTOMER_ID: zod_1.z.string(),
    GOOGLE_ADS_DEVELOPER_TOKEN: zod_1.z.string(),
    YOUTUBE_API_KEY: zod_1.z.string().optional(),
    // Stripe
    STRIPE_SECRET_KEY: zod_1.z.string(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string(),
    // Email
    SMTP_HOST: zod_1.z.string().default('localhost'),
    SMTP_PORT: zod_1.z.string().transform(Number).default('587'),
    SMTP_SECURE: zod_1.z.string().transform(val => val === 'true').default('false'),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().email().default('noreply@mdmc.fr'),
    // File Upload
    UPLOAD_DIR: zod_1.z.string().default('./uploads'),
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default('10485760'), // 10MB
    // Features
    ENABLE_REGISTRATION: zod_1.z.string().transform(val => val === 'true').default('true'),
    ENABLE_GOOGLE_ADS_SYNC: zod_1.z.string().transform(val => val === 'true').default('true'),
    ENABLE_EMAIL_NOTIFICATIONS: zod_1.z.string().transform(val => val === 'true').default('true'),
    // Business Rules
    DEFAULT_CAMPAIGN_PRICE_EUR: zod_1.z.string().transform(Number).default('200'),
    VAT_RATE: zod_1.z.string().transform(Number).default('0.22'),
    CAMPAIGN_DURATION_DAYS: zod_1.z.string().transform(Number).default('30'),
    MAX_CAMPAIGNS_PER_USER: zod_1.z.string().transform(Number).default('10'),
});
let env;
try {
    exports.env = env = envSchema.parse(process.env);
}
catch (error) {
    if (error instanceof zod_1.z.ZodError) {
        console.error('❌ Invalid environment configuration:');
        console.error(error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n'));
        process.exit(1);
    }
    throw error;
}
//# sourceMappingURL=env.js.map