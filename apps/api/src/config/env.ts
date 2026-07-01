import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Email (optional in development)
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_SECURE: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // AI API Keys (at least one required)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

// Validate environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);

    // Check if at least one AI API key is provided
    const hasAIKey = env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY;

    if (!hasAIKey) {
      console.warn(
        '⚠️  WARNING: No AI API keys found. At least one of ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY must be set.'
      );
    }

    // Warn about production settings in development
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.includes('change-this') || env.JWT_SECRET.includes('secret')) {
        throw new Error('JWT_SECRET must be changed in production');
      }

      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        console.warn('⚠️  WARNING: Email not configured. Email features will not work.');
      }
    }

    console.info('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment variables');
    }
    throw error;
  }
}

// Export typed environment
export type Env = z.infer<typeof envSchema>;
