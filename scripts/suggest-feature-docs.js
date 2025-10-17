#!/usr/bin/env node
/**
 * scripts/suggest-feature-docs.js
 *
 * Scans docs/ and suggests a feature->files mapping and canonical docs/features/<feature>.md filenames.
 *
 * Usage:
 *   node scripts/suggest-feature-docs.js > docs-feature-suggestion.json
 *
 * It prints:
 *  - JSON object with suggested feature keys, source files, suggested feature doc path
 *  - A human-readable Markdown table at the end for quick copy-paste into PR body
 */

import fs from "fs";
import path from "path";

const DOCS_ROOT = path.join(process.cwd(), "docs");

if (!fs.existsSync(DOCS_ROOT)) {
  console.error("No docs/ directory found at", DOCS_ROOT);
  process.exit(2);
}

function walk(dir) {
  const out = [];
  const items = fs.readdirSync(dir);
  for (const name of items) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      out.push(...walk(fp));
    } else if (st.isFile() && name.toLowerCase().endsWith(".md")) {
      out.push(fp);
    }
  }
  return out;
}

function slugify(v) {
  return v
    .replace(/(^\s+|\s+$)/g, "")
    .replace(/\.md$/i, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function normalizeFileFeature(fp) {
  const name = path.basename(fp, ".md").toLowerCase();

  // heuristics to strip suffix tokens that indicate phase/summary/notes
  const heuristics = [
    /_(api|fix|summary|phase|impl|implementation|notes|note|doc|documentation|draft)$/i,
    /-(api|fix|summary|phase|impl|implementation|notes|note|doc|documentation|draft)$/i,
  ];

  let cleaned = name;
  for (const h of heuristics) cleaned = cleaned.replace(h, "");

  cleaned = cleaned.replace(/^docs[-_]?/, "");
  cleaned = cleaned.replace(/(^\d+[_-])|([_-]\d+$)/g, "");

  return cleaned || "misc";
}

// attempt to grab first H1 heading to use as nicer title
function readFirstH1(fp) {
  try {
    const txt = fs.readFileSync(fp, "utf8");
    const m = txt.match(/^\s*#\s+(.+)$/m);
    if (m) return m[1].trim();
  } catch (e) {
    /* ignore */
  }
  return null;
}

const files = walk(DOCS_ROOT)
  .map((f) => path.relative(process.cwd(), f))
  .sort();

const features = {}; // featureKey -> { title, suggestedDoc, sources: [] }

for (const f of files) {
  const featureHint = normalizeFileFeature(f);
  const h1 = readFirstH1(f);
  const titleFromH1 = h1 ? slugify(h1) : null;
  const featureKey = titleFromH1 || featureHint;

  if (!features[featureKey]) {
    features[featureKey] = {
      title: titleFromH1 || featureKey,
      sources: [],
      suggested: `docs/features/${featureKey}.md`,
    };
  }
  features[featureKey].sources.push(f);
}

// produce JSON and Markdown table
const out = {
  generated_at: new Date().toISOString(),
  features,
  totalFiles: files.length,
};
console.log(JSON.stringify(out, null, 2));

// human friendly table
console.log("\n\n# Suggested feature doc mapping\n");
console.log("| Feature key | Suggested doc | Source files |");
console.log("|---|---|---|");
for (const key of Object.keys(features).sort()) {
  console.log(
    `| ${key} | ${features[key].suggested} | ${features[key].sources
      .map((s) => "`" + s + "`")
      .join("<br>")} |`
  );
}

console.log(`\n\nTotal docs scanned: ${files.length}`);
