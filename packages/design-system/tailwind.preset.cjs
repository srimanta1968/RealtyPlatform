/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        kiana: {
          primary: '#0F4C81',
          accent: '#E5A823',
          ink: '#0F172A',
          mist: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        kiana: '0.875rem',
      },
    },
  },
  plugins: [],
};
