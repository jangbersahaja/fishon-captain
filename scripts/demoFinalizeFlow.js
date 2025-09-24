#!/usr/bin/env node
/**
 * Small Node script to demonstrate the full authenticated finalize flow via HTTP calls.
 * Steps:
 * 1. Fetch CSRF token (for Credentials provider)
 * 2. Log in (Credentials)
 * 3. Create a draft (if none active) or reuse the returned one
 * 4. PATCH the draft with minimal viable data (optional quick fields)
 * 5. Finalize the draft with media payload
 *
 * Usage: node scripts/demoFinalizeFlow.js --email captain@example.com --password "Password123!" \
 *         --image https://example.com/a.jpg
 *
 * Assumptions:
 * - Dev server running at http://localhost:3000
 * - User with provided credentials exists (see README for creating one)
 * - NEXTAUTH secret + env vars are configured so Credentials provider works
 */

import { config as loadEnv } from "dotenv";
import crypto from "node:crypto";
import process from "node:process";
// Load environment variables: prefer .env.local then fallback to .env
loadEnv({ path: ".env.local" });
loadEnv();
if (!process.env.DATABASE_URL) {
  console.warn(
    "[WARN] DATABASE_URL not found in environment. Prisma operations (outside Next.js dev server) may fail."
  );
}
const args = process.argv.slice(2);

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = list[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const opts = parseArgs(args);
const BASE = opts.base || "http://localhost:3000";
const EMAIL = opts.email || "captain@example.com";
const PASSWORD = opts.password || "Password123!";
const IMAGE_URL = opts.image || "https://example.com/a.jpg";
const AUTO_BOOTSTRAP =
  Boolean(opts["auto-bootstrap"]) || Boolean(opts.autobootstrap);

if (!EMAIL || !PASSWORD) {
  console.error(
    "Email and password required. Pass with --email and --password"
  );
  process.exit(1);
}

// Simple in-memory cookie jar
let cookies = {};
function storeCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  const arr = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders];
  for (const c of arr) {
    const [pair] = c.split(";");
    const [name, value] = pair.split("=");
    cookies[name.trim()] = value.trim();
  }
}
function cookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function jsonFetch(url, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (Object.keys(cookies).length > 0) headers["cookie"] = cookieHeader();
  const res = await fetch(url, { ...init, headers });
  // Collect all Set-Cookie headers robustly
  let setCookieValues = [];
  if (typeof res.headers.getSetCookie === "function") {
    try {
      setCookieValues = res.headers.getSetCookie();
    } catch {
      /* ignore */
    }
  }
  if (setCookieValues.length === 0) {
    for (const [k, v] of res.headers) {
      if (k.toLowerCase() === "set-cookie") setCookieValues.push(v);
    }
  }
  if (setCookieValues.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) setCookieValues.push(single);
  }
  storeCookies(setCookieValues);
  const bodyText = await res.text();
  let json = null;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    /* ignore */
  }
  return { res, json, text: bodyText };
}

async function bootstrapUser() {
  if (!AUTO_BOOTSTRAP) return { attempted: false };
  console.log(
    "No session cookie after login. Attempting dev user bootstrap..."
  );
  const payload = { email: EMAIL, password: PASSWORD, name: "Demo Captain" };
  const res = await jsonFetch(`${BASE}/api/dev/create-test-user`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.res.status !== 200) {
    console.warn(
      `Bootstrap failed (status ${res.res.status}) - response:`,
      res.text
    );
    return { attempted: true, ok: false };
  }
  console.log("Bootstrap created/updated user id:", res.json.id);
  return { attempted: true, ok: true };
}

(async () => {
  console.log("--- Step 1: CSRF Token ---");
  const csrfResp = await jsonFetch(`${BASE}/api/auth/csrf`);
  if (!csrfResp.json || !csrfResp.json.csrfToken) {
    console.error("Failed to obtain CSRF token", csrfResp.text);
    process.exit(1);
  }
  const csrfToken = csrfResp.json.csrfToken;
  console.log("CSRF:", csrfToken);

  console.log("\n--- Step 2: Login (Credentials) ---");
  const form = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: BASE,
  });
  let login = await jsonFetch(
    `${BASE}/api/auth/callback/credentials?json=true`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }
  );
  if (login.res.status >= 400) {
    console.error("Login failed", login.res.status, login.text);
    process.exit(1);
  }
  console.log(
    "Login status:",
    login.res.status,
    login.json ? "(json mode)" : ""
  );
  const hasSessionCookie = Object.keys(cookies).some((k) =>
    k.toLowerCase().includes("session")
  );
  if (!hasSessionCookie) {
    console.warn(
      "WARNING: No session cookie captured yet. Keys:",
      Object.keys(cookies)
    );
    if (opts.debug) {
      console.log("Login JSON response:", login.json);
    }
    const maybe = await bootstrapUser();
    if (maybe.ok) {
      console.log("Retrying login after bootstrap...");
      login = await jsonFetch(
        `${BASE}/api/auth/callback/credentials?json=true`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        }
      );
    }
    const hasAfter = Object.keys(cookies).some((k) =>
      k.toLowerCase().includes("session")
    );
    if (!hasAfter) {
      console.error(
        "Still no session cookie after login" +
          (maybe.attempted ? " & bootstrap" : "") +
          ". Aborting."
      );
      if (opts.debug) {
        console.error("Final login response status:", login.res.status);
        console.error("Final login response body:", login.text);
      }
      process.exit(1);
    }
  }
  if (opts.debug) console.log("Cookies after login:", cookies);

  console.log("\n--- Step 3: Create Draft (or reuse existing) ---");
  const createDraft = await jsonFetch(`${BASE}/api/charter-drafts`, {
    method: "POST",
  });
  if (createDraft.res.status !== 200) {
    console.error(
      "Draft create failed",
      createDraft.res.status,
      createDraft.text
    );
    process.exit(1);
  }
  const draftId = createDraft.json.id;
  const version = createDraft.json.version;
  console.log("Draft ID:", draftId, "Version:", version);

  console.log("\n--- Step 4: Patch Draft (minimal data) ---");
  const patchPayload = {
    data: {
      basics: { name: "Demo Charter " + crypto.randomUUID().slice(0, 8) },
      media: { images: [{ name: "cover", url: IMAGE_URL }] },
    },
    // version is optimistic concurrency; not required for patch if server merges, but safe to include
    version,
  };
  const patch = await jsonFetch(`${BASE}/api/charter-drafts/${draftId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patchPayload),
  });
  if (patch.res.status !== 200) {
    console.error("Patch failed", patch.res.status, patch.text);
    process.exit(1);
  }
  const newVersion = patch.json.version;
  console.log("Patch OK. New version:", newVersion);

  console.log("\n--- Step 5: Finalize ---");
  const finalizePayload = {
    media: { images: [{ name: "cover", url: IMAGE_URL }], videos: [] },
  };
  const finalize = await jsonFetch(
    `${BASE}/api/charter-drafts/${draftId}/finalize`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-draft-version": String(newVersion),
      },
      body: JSON.stringify(finalizePayload),
    }
  );
  if (finalize.res.status !== 200) {
    console.error("Finalize failed", finalize.res.status, finalize.text);
    process.exit(1);
  }
  console.log("Finalize response:", finalize.json);
  console.log("\nFlow complete. CharterId =", finalize.json.charterId);
})();
