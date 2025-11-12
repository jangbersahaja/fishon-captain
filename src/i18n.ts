import { getRequestConfig } from "next-intl/server";

// Our supported locales
export const locales = ["ms", "en"] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = "ms";

export default getRequestConfig(async ({ requestLocale }) => {
  // This gets the locale from the middleware
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
