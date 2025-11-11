import { getRequestConfig } from "next-intl/server";

// Our supported locales
export const locales = ["ms", "en"] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = "ms";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
