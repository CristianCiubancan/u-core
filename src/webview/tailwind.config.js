/** @type {import('tailwindcss').Config} */
const themeConfig = require('./theme/theme');
const plugins = require('./theme/plugins');
const safelist = require('./theme/safelist');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,astro,html}',
    './pages/**/*.{js,jsx,ts,tsx,astro,html}',
    './components/**/*.{js,jsx,ts,tsx,astro,html}',
  ],
  theme: {
    extend: themeConfig,
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    ...plugins,
  ],
  safelist,
};
