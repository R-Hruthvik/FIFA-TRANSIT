/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at application startup.
 * Run this module early in the application lifecycle to fail fast on missing config.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ============================================================================
  // REQUIRED VARIABLES - Application will not start without these
  // ============================================================================

  // MongoDB URI
  if (!process.env.MONGODB_URI) {
    errors.push(
      'MONGODB_URI is required. Add your MongoDB Atlas connection string to .env.local'
    );
  } else if (!process.env.MONGODB_URI.startsWith('mongodb://') && 
             !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push(
      'MONGODB_URI must start with "mongodb://" or "mongodb+srv://".'
    );
  }

  // NextAuth Secret (critical for JWT encryption)
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      errors.push(
        'NEXTAUTH_SECRET or AUTH_SECRET is required in production. ' +
        'Generate one with: openssl rand -base64 32'
      );
    } else {
      warnings.push(
        'NEXTAUTH_SECRET not set. Using temporary dev secret. ' +
        'Set NEXTAUTH_SECRET for consistent sessions across restarts.'
      );
    }
  } else if (process.env.AUTH_SECRET === '' || process.env.NEXTAUTH_SECRET === '') {
    errors.push(
      'NEXTAUTH_SECRET/AUTH_SECRET cannot be an empty string. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  // Google OAuth (required for authentication to work)
  if (!process.env.GOOGLE_CLIENT_ID) {
    warnings.push(
      'GOOGLE_CLIENT_ID not set. Google sign-in will not work. ' +
      'Get credentials from https://console.cloud.google.com/apis/credentials'
    );
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push(
      'GOOGLE_CLIENT_SECRET not set. Google sign-in will not work. ' +
      'Get credentials from https://console.cloud.google.com/apis/credentials'
    );
  }

  // ============================================================================
  // FEATURE-SPECIFIC VARIABLES - Features degrade gracefully without these
  // ============================================================================

  // AI Providers (at least one recommended)
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasNvidiaKey = !!process.env.NVIDIA_NIM_API_KEY;
  const hasVertexConfig = !!process.env.VERTEX_PROJECT_ID || !!process.env.VERTEX_API_KEY;

  if (!hasGeminiKey && !hasNvidiaKey && !hasVertexConfig) {
    warnings.push(
      'No AI provider configured. AI features (FanAssist, Egress Plans, Insights) will be disabled. ' +
      'Set GEMINI_API_KEY, NVIDIA_NIM_API_KEY, or VERTEX credentials.'
    );
  }

  // Google Maps API (for transit directions)
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    warnings.push(
      'GOOGLE_MAPS_API_KEY not set. Transit direction features may be limited.'
    );
  }

  // Match Data Provider (optional - app works without live scores)
  const hasFootballDataKey = !!process.env.FOOTBALL_DATA_API_KEY;
  const hasApiFootballKey = !!process.env.API_FOOTBALL_KEY;

  if (!hasFootballDataKey && !hasApiFootballKey) {
    warnings.push(
      'No match data provider configured. Live scoreboard will show demo data. ' +
      'Set FOOTBALL_DATA_API_KEY or API_FOOTBALL_KEY for real match data.'
    );
  }

  // Cron Secret (for admin ops-agent)
  if (!process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      warnings.push(
        'CRON_SECRET not set. Scheduled admin operations will not work. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }
  }

  // ============================================================================
  // OPTIONAL CONFIGURATION VALIDATION
  // ============================================================================

  // Validate Match API Provider selection
  const matchProvider = process.env.MATCH_API_PROVIDER;
  if (matchProvider && !['football-data', 'api-football'].includes(matchProvider)) {
    warnings.push(
      `MATCH_API_PROVIDER "${matchProvider}" is not recognized. Use "football-data" or "api-football".`
    );
  }

  // Validate Cache TTL
  const cacheTtl = process.env.MATCH_API_CACHE_TTL;
  if (cacheTtl) {
    const ttlNum = parseInt(cacheTtl, 10);
    if (isNaN(ttlNum) || ttlNum < 0) {
      warnings.push(
        `MATCH_API_CACHE_TTL "${cacheTtl}" is invalid. Must be a positive number in seconds.`
      );
    }
  }

  // Redis URL format check
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL;
  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    warnings.push(
      `RATE_LIMIT_REDIS_URL "${redisUrl}" may be invalid. Should start with "redis://" or "rediss://".`
    );
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  const isValid = errors.length === 0;

  return {
    valid: isValid,
    errors,
    warnings,
  };
}

/**
 * Run validation and log results. Throws error if critical issues found.
 */
export function runEnvironmentValidation(): void {
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    result.warnings.forEach((w) => console.log(`   • ${w}`));
    console.log('');
  }

  // Throw on errors
  if (result.errors.length > 0) {
    console.error('\n❌ Critical Environment Errors:\n');
    result.errors.forEach((e) => console.error(`   • ${e}\n`));
    console.error(
      'Please fix these issues and restart the application.\n' +
      'See .env.example for configuration guidance.\n'
    );
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s)`
    );
  }

  if (result.warnings.length === 0) {
    console.log('✅ Environment validation passed - all systems ready\n');
  } else {
    console.log(`⚡ Starting with ${result.warnings.length} warning(s) - some features may be limited\n`);
  }
}

// Auto-run validation when imported in development
if (process.env.NODE_ENV === 'development' && require.main === module) {
  runEnvironmentValidation();
}
