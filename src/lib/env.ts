// Centralized runtime environment loader & validator.
// Evaluated on first import; throws early for invalid/missing server config.
// Public variables (NEXT_PUBLIC_*) are re-exported in a typed shape.

const REQUIRED_SERVER = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

// (Optional server variables are documented; no current mandatory usage list needed.)

const PUBLIC_PREFIX = "NEXT_PUBLIC_";

interface PublicEnvShape {
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

interface ServerEnvShape extends PublicEnvShape {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_PLACES_API_KEY?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  QSTASH_TOKEN?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
  EXTERNAL_WORKER_URL?: string;
  QSTASH_URL?: string;
  BLOB_HOSTNAME?: string;
  NODE_ENV: string;
}

function assertPresent(
  key: string,
  value: string | undefined | null,
  errors: string[]
) {
  if (!value || !String(value).trim()) errors.push(`${key} is required`);
}

function looksLikeUrl(val: string | undefined): boolean {
  if (!val) return false;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

function entropyCheck(secret: string): boolean {
  // Very light heuristic: length >= 32 and not composed solely of base words.
  if (!secret || secret.length < 32) return false;
  const simplePatterns = /(password|secret|changeme|example|test)/i;
  return !simplePatterns.test(secret);
}

function distinct(a?: string, b?: string) {
  return !!a && !!b && a !== b;
}

export function loadEnv(): ServerEnvShape {
  const errors: string[] = [];
  const w: NodeJS.ProcessEnv = process.env;

  // Required server vars
  for (const k of REQUIRED_SERVER) assertPresent(k, w[k], errors);

  // Public vars (do not enforce required unless design needs them)
  const publicVars: PublicEnvShape = {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SITE_URL: w.NEXT_PUBLIC_SITE_URL,
  };

  // Shape validations
  if (w.DATABASE_URL && !w.DATABASE_URL.startsWith("postgres")) {
    errors.push("DATABASE_URL should start with postgres:// or postgresql://");
  }
  if (w.NEXTAUTH_SECRET && !entropyCheck(w.NEXTAUTH_SECRET)) {
    errors.push("NEXTAUTH_SECRET appears weak (length < 32 or low entropy)");
  }
  if (w.EXTERNAL_WORKER_URL && !looksLikeUrl(w.EXTERNAL_WORKER_URL)) {
    errors.push("EXTERNAL_WORKER_URL is not a valid URL");
  }
  if (w.QSTASH_URL && !looksLikeUrl(w.QSTASH_URL)) {
    errors.push("QSTASH_URL is not a valid URL");
  }

  // Warn if Google server key missing but Places endpoints may be used.
  if (!w.GOOGLE_PLACES_API_KEY) {
    console.warn(
      "[env] GOOGLE_PLACES_API_KEY missing; Places endpoints will 500."
    );
  }

  // Warn if same key reused for maps + places (should be distinct). Not fatal.
  if (
    w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY &&
    w.GOOGLE_PLACES_API_KEY &&
    !distinct(w.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, w.GOOGLE_PLACES_API_KEY)
  ) {
    console.warn(
      "[env] Reusing the same Google key for Maps & Places; recommend splitting for least privilege."
    );
  }

  // Secret leakage guard: disallow server secrets accidentally prefixed with NEXT_PUBLIC_
  for (const key of Object.keys(w)) {
    if (key.startsWith(PUBLIC_PREFIX) && REQUIRED_SERVER.includes(key)) {
      errors.push(
        `Sensitive key ${key} should not be exposed with NEXT_PUBLIC_ prefix.`
      );
    }
  }

  if (errors.length) {
    throw new Error(
      "Environment validation failed:\n" +
        errors.map((e) => " - " + e).join("\n")
    );
  }

  return {
    DATABASE_URL: w.DATABASE_URL!,
    NEXTAUTH_SECRET: w.NEXTAUTH_SECRET!,
    GOOGLE_CLIENT_ID: w.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: w.GOOGLE_CLIENT_SECRET!,
    GOOGLE_PLACES_API_KEY: w.GOOGLE_PLACES_API_KEY,
    BLOB_READ_WRITE_TOKEN: w.BLOB_READ_WRITE_TOKEN,
    QSTASH_TOKEN: w.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: w.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: w.QSTASH_NEXT_SIGNING_KEY,
    EXTERNAL_WORKER_URL: w.EXTERNAL_WORKER_URL,
    QSTASH_URL: w.QSTASH_URL,
    BLOB_HOSTNAME: w.BLOB_HOSTNAME,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: publicVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SITE_URL: publicVars.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: w.NODE_ENV || "development",
  };
}

// Singleton pattern to avoid repeated validation overhead.
let cached: ServerEnvShape | null = null;
export function getEnv(): ServerEnvShape {
  if (!cached) cached = loadEnv();
  return cached;
}

// Test-only helper to force re-validation with mutated process.env. Not for runtime use.
export function __resetEnvCacheForTests() {
  cached = null;
}

// Convenience export for server code: lazy proxy so tests can mutate process.env before first access.
export const env: ServerEnvShape = new Proxy(
  {},
  {
    get(_t, p) {
      return (getEnv() as unknown as Record<string, unknown>)[p as string];
    },
    ownKeys() {
      return Reflect.ownKeys(getEnv() as unknown as Record<string, unknown>);
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  }
) as ServerEnvShape;

// For client components, only import the specific NEXT_PUBLIC_* vars directly
// via process.env (Next.js inlines them). Do not re-export secrets through this module.
