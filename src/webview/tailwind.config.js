/** @type {import('tailwindcss').Config} */
const themeConfig = require('./config/theme');
const plugins = require('./config/plugins');

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
  safelist: require('./config/safelist'),
};
