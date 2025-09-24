/*
 * Simple environment sanity checker.
 * Run with: npx ts-node scripts/check-env.ts (or add a package.json script)
 */

const REQUIRED = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const missing = REQUIRED.filter(
  (k) => !process.env[k] || !process.env[k]?.trim()
);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

// Quick placeholder detection
const placeholderPatterns = [/your/i, /example/i, /changeme/i, /placeholder/i];
const flagged: string[] = [];
for (const key of REQUIRED) {
  const val = process.env[key] || "";
  if (placeholderPatterns.some((re) => re.test(val))) flagged.push(key);
}
if (flagged.length) {
  console.warn(
    "Warning: potential placeholder values detected for:",
    flagged.join(", ")
  );
}

console.log("Environment looks OK (basic checks passed)");
