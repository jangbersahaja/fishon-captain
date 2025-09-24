/**
 * Environment sanity checker.
 * Loads .env, then .env.local (overrides), then any process overrides.
 * Run: node scripts/check-env.js
 */
import("dotenv")
  .then((d) => {
    // Load base .env first (if present)
    d.config({ path: ".env" });
    // Then local overrides
    d.config({ path: ".env.local" });

    const REQUIRED = [
      "DATABASE_URL",
      "NEXTAUTH_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      // Public/browser keys (still check presence so dev doesn't forget)
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
      // Optional but recommended; won't fail build if missing
      // Add more here as new integrations are added
    ];

    const OPTIONAL = [
      "GOOGLE_PLACES_API_KEY", // server-side Places (autocomplete/details)
      "BLOB_READ_WRITE_TOKEN",
      "QSTASH_TOKEN",
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
      "EXTERNAL_WORKER_URL",
      "NEXT_PUBLIC_SITE_URL",
    ];

    const missing = REQUIRED.filter(
      (k) => !process.env[k] || !String(process.env[k]).trim()
    );
    if (missing.length) {
      console.error("Missing required env vars:", missing.join(", "));
    }

    const placeholderPatterns = [
      /your/i,
      /example/i,
      /changeme/i,
      /placeholder/i,
      /REPLACE_ME/i,
    ];
    const flagged = [];
    for (const key of [...REQUIRED, ...OPTIONAL]) {
      const val = process.env[key];
      if (!val) continue;
      if (placeholderPatterns.some((re) => re.test(val))) flagged.push(key);
    }
    if (flagged.length) {
      console.warn(
        "Warning: potential placeholder values detected for:",
        flagged.join(", ")
      );
    }

    // Summary table
    const longest = Math.max(
      ...[...REQUIRED, ...OPTIONAL].map((k) => k.length)
    );
    function pad(s) {
      return s.padEnd(longest, " ");
    }

    console.log("\nEnvironment Variable Summary");
    console.log("-".repeat(longest + 26));
    for (const key of REQUIRED) {
      const ok = missing.includes(key) ? "MISSING" : "OK";
      console.log(`${pad(key)} : ${ok}`);
    }
    for (const key of OPTIONAL) {
      const present = process.env[key] ? "present" : "—";
      console.log(`${pad(key)} : ${present}`);
    }
    console.log("-".repeat(longest + 26));

    if (missing.length) {
      process.exitCode = 1;
      console.error("\nEnvironment check failed. Add the missing vars above.");
    } else {
      console.log("\nEnvironment looks OK (basic checks passed).");
    }
  })
  .catch((err) => {
    console.error("Failed to load dotenv:", err);
    process.exit(1);
  });
