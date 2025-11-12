## Plan: Marketing Pages Multi-Language Support (Malay Default + English)

**TL;DR:** Implement next-intl for marketing pages only with Malay (ms) as default and English (en) as option. Scope: ~200 translation keys covering landing page (8 sections), navbar, footer, and SEO metadata. Cookie-based locale detection with optional `/en/` prefix for cleaner URLs.

**Phases (4 phases)**

1. **Phase 1: Foundation & Infrastructure**
   - **Objective:** Install next-intl, configure middleware for marketing routes only, set up translation file structure, create locale switcher
   - **Files/Functions to Modify/Create:**
     - `package.json` - Add next-intl dependency
     - `src/i18n.ts` (new) - next-intl configuration (locales: ms/en, default: ms)
     - `src/middleware.ts` - Add locale detection for public/marketing routes only (exclude /captain, /staff, /api)
     - `locales/ms/marketing.json` (new) - Malay translations for landing page
     - `locales/en/marketing.json` (new) - English translations for landing page
     - `locales/ms/common.json` (new) - Navbar, footer, shared strings (Malay)
     - `locales/en/common.json` (new) - Navbar, footer, shared strings (English)
     - `src/components/LanguageSwitcher.tsx` (new) - Locale toggle button component
     - `src/app/layout.tsx` - Wrap with NextIntlClientProvider
   - **Tests to Write:**
     - `__tests__/i18n/config.test.ts` - Test locale detection logic
     - `__tests__/components/LanguageSwitcher.test.tsx` - Test locale toggle
     - `__tests__/middleware-i18n.test.ts` - Test middleware applies only to marketing routes
   - **Steps:**
     1. Write tests for i18n configuration (locale detection, fallback to ms, cookie persistence)
     2. Run tests to see them fail
     3. Install next-intl: `npm install next-intl`
     4. Create `src/i18n.ts` with locale config: locales=['ms','en'], defaultLocale='ms'
     5. Update `src/middleware.ts` to apply next-intl only to public routes (not /captain, /staff, /api)
     6. Create translation directory structure: `/locales/ms/`, `/locales/en/`
     7. Create empty `marketing.json` and `common.json` for both locales
     8. Create `LanguageSwitcher.tsx` component with MS/EN toggle button
     9. Update root `layout.tsx` to wrap with NextIntlClientProvider and include locale in props
     10. Run tests to confirm locale switching works
     11. Verify locale cookie persists and applies on page reload

2. **Phase 2: Landing Page Sections Translation**
   - **Objective:** Translate all 8 landing page sections (Hero, ValueProps, HowItWorks, CaptainShowcase, Pricing, Safety, FAQ, FinalCTA) + main page metadata
   - **Files/Functions to Modify/Create:**
     - `locales/ms/marketing.json`, `locales/en/marketing.json` - Add ~150 translation keys for all sections
     - `src/app/(marketing)/list-your-business/HeroSection.tsx` - Convert to use `useTranslations('marketing')`
     - `src/app/(marketing)/list-your-business/ValuePropsSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/HowItWorksSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/CaptainShowcaseSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/PricingSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/SafetyAwardsSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/FAQSection.tsx` - Convert to use translations
     - `src/app/(marketing)/list-your-business/FinalCTASection.tsx` - Convert to use translations
     - `src/app/page.tsx` - Convert metadata to use locale-aware generation with `generateMetadata`
   - **Tests to Write:**
     - `__tests__/marketing/HeroSection.test.tsx` - Test hero headline, CTA buttons, stats in both locales
     - `__tests__/marketing/ValuePropsSection.test.tsx` - Test 4 feature cards render in ms/en
     - `__tests__/marketing/FAQSection.test.tsx` - Test FAQ accordion items in both locales
     - `__tests__/marketing/metadata.test.ts` - Test SEO metadata generation per locale
   - **Steps:**
     1. Write tests for HeroSection translations (headline, CTA buttons, stats)
     2. Run tests to see them fail
     3. Extract all HeroSection English strings into `marketing.json` with keys like `hero.title`, `hero.subtitle`, `hero.cta.register`, `hero.cta.whatsapp`
     4. Add Malay translations for all hero keys in `locales/ms/marketing.json`
     5. Convert HeroSection.tsx to use `useTranslations('marketing')` for all text
     6. Extract and translate ValuePropsSection (4 feature cards: title, description, icon label)
     7. Extract and translate HowItWorksSection (3 steps: title, description)
     8. Extract and translate CaptainShowcaseSection (testimonials/showcase)
     9. Extract and translate PricingSection (pricing tiers, features)
     10. Extract and translate SafetyAwardsSection (trust badges)
     11. Extract and translate FAQSection (FAQ questions and answers)
     12. Extract and translate FinalCTASection (final call-to-action)
     13. Update `src/app/page.tsx` to generate locale-aware metadata using `generateMetadata` with `getTranslations`
     14. Run tests to confirm all sections render correctly in both locales
     15. Verify complete landing page works in Malay (default) and English (when switched)

3. **Phase 3: Navigation & Footer Translation**
   - **Objective:** Translate navbar menu items, footer links, and tooltips
   - **Files/Functions to Modify/Create:**
     - `locales/ms/common.json`, `locales/en/common.json` - Add ~50 keys for nav/footer
     - `src/components/Navbar.tsx` - Convert menu labels, tooltips, and button text to use `useTranslations('common')`
     - `src/components/Footer.tsx` - Convert footer sections, links, and copyright text to use `useTranslations('common')`
   - **Tests to Write:**
     - `__tests__/components/Navbar.test.tsx` - Test nav items (Marketplace, Captain Portal, Staff Portal, Sign in/out) in both locales
     - `__tests__/components/Footer.test.tsx` - Test footer sections (Company Info, Quick Links, Support) in both locales
   - **Steps:**
     1. Write tests for Navbar translations (menu items, tooltips, sign in/out buttons)
     2. Run tests to see them fail
     3. Extract Navbar strings into `common.json` with keys like `nav.marketplace`, `nav.captainPortal`, `nav.signIn`, `nav.signOut`, `nav.menu`
     4. Add Malay translations for all nav keys
     5. Convert Navbar.tsx to use `useTranslations('common')` for all labels and tooltips
     6. Extract Footer strings into `common.json` with keys like `footer.companyInfo`, `footer.quickLinks`, `footer.support`, `footer.copyright`, `footer.madeInMalaysia`
     7. Add Malay translations for all footer keys
     8. Convert Footer.tsx to use `useTranslations('common')` for all text
     9. Run tests to confirm nav and footer work in both locales
     10. Verify navigation persists locale selection across page loads

4. **Phase 4: SEO & Polish**
   - **Objective:** Add SEO metadata per locale (hreflang, alternate links), integrate LanguageSwitcher in navbar, test complete user journey
   - **Files/Functions to Modify/Create:**
     - `src/app/page.tsx` - Add hreflang tags and alternate links in metadata
     - `src/components/Navbar.tsx` - Integrate LanguageSwitcher component in navbar (desktop & mobile)
     - `next-sitemap.config.js` (new or update) - Generate sitemap with locale-specific URLs
     - Update any hardcoded URLs to be locale-aware
   - **Tests to Write:**
     - `__tests__/seo/metadata.test.ts` - Test hreflang tags, canonical URLs per locale
     - `__tests__/integration/locale-journey.test.tsx` - Test complete user journey: land on site → switch locale → navigate → locale persists
   - **Steps:**
     1. Write tests for SEO metadata (hreflang, alternate links, canonical URLs)
     2. Run tests to see them fail
     3. Update `src/app/page.tsx` metadata to include hreflang tags for ms and en
     4. Add alternate links for both locales in metadata
     5. Integrate LanguageSwitcher component in Navbar (add MS/EN toggle button)
     6. Position switcher in navbar (desktop: near menu button, mobile: in quick access bar)
     7. Style switcher to match navbar design (pill toggle or dropdown)
     8. Create or update `next-sitemap.config.js` to generate locale-specific URLs
     9. Run tests to confirm SEO tags are correct
     10. Test complete user journey: arrive at site (Malay) → switch to English → browse page → reload → language persists
     11. Verify Google Search Console recognizes hreflang tags (manual check)
     12. Verify all links work correctly in both languages

**Decisions Made**

1. **WhatsApp message locale:** ❌ Keep Malay only - "Saya nak join Fishon Captain" (no locale change)

2. **Language switcher design:** ✅ Pill toggle `[MS | EN]` in navbar right (near menu button)

3. **Translation quality:** ✅ AI-generated + native speaker review (faster iteration)

4. **URL structure:** ✅ Cookie-based with `/en/` prefix for English only (recommended)

5. **Metadata per locale:** ✅ Yes, translate page titles:
   - English: "List Your Charter | Fishon.my"
   - Malay: "Senaraikan Charter Anda | Fishon.my"
