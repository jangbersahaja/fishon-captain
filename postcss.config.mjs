// Tailwind CSS v4: use the new standalone PostCSS plugin. The proper shape is
// an object keyed by the module specifier (or you can require/import the
// function). An array of strings is not a valid PostCSS plugin instance and
// causes "Invalid PostCSS Plugin" when tooling (e.g. Vitest/Vite) loads it.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
