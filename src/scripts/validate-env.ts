#!/usr/bin/env tsx

/**
 * Script de validation de l'environnement
 * Vérifie que toutes les variables nécessaires sont configurées
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';

interface ValidationResult {
  service: string;
  status: 'OK' | 'ERROR' | 'WARNING';
  message: string;
  details?: any;
}

async function validateEnvironment(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test configuration variables
  results.push({
    service: 'Configuration',
    status: 'OK',
    message: 'All environment variables loaded successfully',
    details: {
      nodeEnv: env.NODE_ENV,
      port: env.API_PORT,
      baseUrl: env.API_BASE_URL,
    },
  });

  // Test database connection
  try {
    await prisma.$connect();
    await prisma.user.findFirst();
    results.push({
      service: 'PostgreSQL Database',
      status: 'OK',
      message: 'Database connection successful',
    });
  } catch (error) {
    results.push({
      service: 'PostgreSQL Database',
      status: 'ERROR',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test Redis connection
  try {
    await redis.ping();
    results.push({
      service: 'Redis Cache',
      status: 'OK',
      message: 'Redis connection successful',
    });
  } catch (error) {
    results.push({
      service: 'Redis Cache',
      status: 'ERROR',
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test JWT secrets
  if (env.JWT_SECRET.length < 32) {
    results.push({
      service: 'JWT Security',
      status: 'ERROR',
      message: 'JWT_SECRET must be at least 32 characters long',
    });
  } else {
    results.push({
      service: 'JWT Security',
      status: 'OK',
      message: 'JWT secrets are properly configured',
    });
  }

  // Test Stripe configuration
  if (!env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    results.push({
      service: 'Stripe',
      status: 'ERROR',
      message: 'Invalid Stripe secret key format',
    });
  } else {
    results.push({
      service: 'Stripe',
      status: 'OK',
      message: 'Stripe configuration appears valid',
    });
  }

  // Test Google APIs configuration
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    results.push({
      service: 'Google APIs',
      status: 'WARNING',
      message: 'Google OAuth credentials not configured',
    });
  } else {
    results.push({
      service: 'Google APIs',
      status: 'OK',
      message: 'Google OAuth credentials configured',
    });
  }

  // Test email configuration
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    results.push({
      service: 'Email Service',
      status: 'WARNING',
      message: 'SMTP configuration incomplete',
    });
  } else {
    results.push({
      service: 'Email Service',
      status: 'OK',
      message: 'SMTP configuration appears complete',
    });
  }

  return results;
}

async function main() {
  console.log('🔍 Validating MDMC Backend Environment...\n');

  try {
    const results = await validateEnvironment();

    let hasErrors = false;
    let hasWarnings = false;

    for (const result of results) {
      const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${result.service}: ${result.message}`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }

      if (result.status === 'ERROR') hasErrors = true;
      if (result.status === 'WARNING') hasWarnings = true;
    }

    console.log('\n' + '='.repeat(50));

    if (hasErrors) {
      console.log('❌ Environment validation FAILED - Please fix the errors above');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠️  Environment validation completed with warnings');
      console.log('   The application should start but some features may not work');
    } else {
      console.log('✅ Environment validation PASSED - All systems ready!');
    }

  } catch (error) {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

if (require.main === module) {
  main();
}