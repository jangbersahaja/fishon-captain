---
type: fix
status: blocked
updated: 2025-10-17
feature: schemas
author: copilot
---

# Fix: External Schema Package Build Configuration

## Summary

Migration to `@fishon/schemas` external package is complete at the code level, but Next.js builds are blocked due to missing compiled JavaScript files in the external package.

## What's in this plan

- [x] Identify root cause of build failure
- [x] Document issue and required fixes
- [ ] Fix fishon-schemas repository build configuration
- [ ] Verify Next.js build works after fix
- [ ] Remove .env file added for testing

## Problem

The `@fishon/schemas` package (github:jangbersahaja/fishon-schemas) is missing compiled JavaScript files needed for Next.js bundling.

### Current State

**TypeScript Compilation:** ✅ Works
- Uses `.d.ts` declaration files from `dist/`
- `npm run typecheck` passes

**Next.js Build:** ❌ Fails
- Requires `.js` files for bundling
- `npm run build` fails with module resolution errors

### Package Structure Issues

The fishon-schemas repository's `package.json` declares:

```json
{
  "main": "dist/index.cjs.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist"]
}
```

But the `dist/` folder only contains:
- ✅ `*.d.ts` - TypeScript declarations
- ❌ `*.js` / `*.cjs.js` / `*.mjs` - Compiled JavaScript (missing)

## Root Cause

The fishon-schemas repository:
1. Doesn't commit compiled JS files to git
2. Doesn't run build script during npm install
3. Restricts installed files to `dist/` only (excludes `src/`)

This means when installed via `npm install github:jangbersahaja/fishon-schemas`:
- npm clones the repo
- npm only copies `dist/` folder (per "files" field)
- No build script runs (no "prepare" script defined)
- Result: TypeScript declarations present, but no JavaScript files

## Required Fix in fishon-schemas Repository

Choose ONE of these approaches:

### Option A: Commit Built Files (Recommended for git dependencies)

```bash
# In fishon-schemas repo
npm run build
git add dist/*.js dist/*.cjs.js dist/*.mjs
git commit -m "chore: Add compiled JavaScript files to dist"
git push
```

**Pros:**
- Works immediately with git dependencies
- No build step needed during install
- Faster consumer install times

**Cons:**
- Increases repo size
- Need to remember to rebuild before commits

### Option B: Build During Install

Update `package.json`:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepare": "npm run build"  // Add this
  },
  "files": ["dist", "src"]  // Add "src" to include source files
}
```

**Pros:**
- Always fresh builds
- Repo stays clean (no built files)

**Cons:**
- Slower install times
- Requires TypeScript in consumer's environment
- May break if consumer has different Node/TS version

### Option C: Publish to npm Registry (Best for production)

```bash
# In fishon-schemas repo
npm run build
npm publish
```

Then in fishon-captain:

```json
{
  "dependencies": {
    "@fishon/schemas": "^0.1.0"  // From npm registry
  }
}
```

**Pros:**
- Standard npm workflow
- Versioning and caching benefits
- Guaranteed to have built files

**Cons:**
- Requires npm registry access
- Extra step in release workflow

## Temporary Workarounds Applied

### 1. Added transpilePackages Config

`next.config.ts`:
```typescript
transpilePackages: ["@fishon/schemas"]
```

**Status:** Insufficient - package doesn't include source files

### 2. Wrapper Files Maintained

Kept wrapper files that re-export from @fishon/schemas:
- `src/lib/schemas/video.ts`
- `src/server/media.ts`
- `src/server/drafts.ts`
- `src/types/videoUpload.ts`
- `src/features/charter-onboarding/charterForm.schema.ts`

**Purpose:** Maintain backward compatibility with existing imports

## Migration Status

### Completed
- ✅ All code imports updated to use @fishon/schemas
- ✅ Local src/schemas directory removed
- ✅ TypeScript compilation works
- ✅ Lint passes
- ✅ Tests configuration updated

### Blocked
- ⏸️ Next.js build (waiting on external package fix)
- ⏸️ Production deployment (same)

## Testing the Fix

After fishon-schemas repository is updated:

```bash
# 1. Reinstall dependency
npm install

# 2. Verify compiled files exist
ls node_modules/@fishon/schemas/dist/*.js

# 3. Run type check
npm run typecheck

# 4. Run build
npm run build

# 5. Run tests
npm test
```

## Alternative: Temporary Revert

If external package fix is delayed, can temporarily revert to local schemas:

```bash
# 1. Restore src/schemas from git history
git checkout HEAD~3 -- src/schemas/

# 2. Update imports back to @/schemas
# (Run search/replace)

# 3. Remove @fishon/schemas dependency
npm uninstall @fishon/schemas
```

**Not recommended** - defeats purpose of migration

## References

- External repo: https://github.com/jangbersahaja/fishon-schemas
- PR branch: copilot/update-schema-imports
- Related issue: #[issue-number]

## Review Notes

**For Maintainers:**

Before merging this PR:
1. Fix fishon-schemas repository build (see Required Fix above)
2. Run `npm install` to get updated package
3. Verify `npm run build` succeeds
4. Test full CI pipeline

**Recommendation:** Use Option A (commit built files) for quickest resolution, then migrate to Option C (npm registry) for long-term maintainability.
