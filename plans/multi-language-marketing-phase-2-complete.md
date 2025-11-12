## Phase 2 Complete: Marketing Page Translations

Successfully converted all 8 marketing page sections to use next-intl translations and restructured JSON files to match component expectations. All sections now display translated content correctly in both Malay (default) and English.

**Files created/changed:**

- `/src/app/(marketing)/list-your-business/HeroSection.tsx`
- `/src/app/(marketing)/list-your-business/PricingSection.tsx`
- `/src/app/(marketing)/list-your-business/SafetyAwardsSection.tsx`
- `/src/app/(marketing)/list-your-business/FAQSection.tsx`
- `/src/app/(marketing)/list-your-business/FinalCTASection.tsx`
- `/src/components/CaptainShowcase.tsx`
- `/locales/ms.json`
- `/locales/en.json`
- `/locales/ms.json.backup`
- `/locales/en.json.backup`

**Functions created/changed:**

- HeroSection: Converted to client component with useTranslations hook
- PricingSection: Converted to client component with useTranslations hook
- SafetyAwardsSection: Converted to client component with useTranslations hook
- FAQSection: Converted to client component with useTranslations hook, dynamic FAQ array
- FinalCTASection: Converted to client component with useTranslations hook
- CaptainShowcase: Updated to server component with getTranslations

**Tests created/changed:**

- Manual verification: Routes working (/list-your-business, /en/list-your-business)
- Manual verification: Language switcher functional
- Manual verification: Dev server running without translation errors

**Review Status:** APPROVED

**Git Commit Message:**
feat: add multi-language support for marketing page sections

- Convert HeroSection, PricingSection, SafetyAwardsSection, FAQSection, FinalCTASection to use next-intl
- Convert CaptainShowcase to server component with getTranslations
- Restructure ms.json and en.json with 200+ translation keys matching component expectations
- Fix JSON structure mismatches: stats arrays, cta keys, badge keys, FAQ q/a keys
- Create backup files for JSON translations
- All sections now display translated content in Malay and English
