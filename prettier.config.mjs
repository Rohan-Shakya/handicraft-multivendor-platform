/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
  tabWidth: 2,
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 — point to the CSS file instead of tailwind.config
  tailwindStylesheet: "./apps/storefront/src/app/globals.css",
};

export default config;
