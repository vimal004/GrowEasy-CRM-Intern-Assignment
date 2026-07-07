const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/features/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-google-sans)', ...fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          onContainer: 'var(--on-primary-container)',
        },
        background: 'var(--background)',
        surface: 'var(--surface)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        border: 'var(--border)',
      },
      borderRadius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '28px',
        '3xl': '32px',
        full: '9999px',
      },
      boxShadow: {
        elevation1: '0px 1px 3px 1px var(--shadow-color), 0px 1px 2px 0px var(--shadow-color)',
        elevation2: '0px 2px 6px 2px var(--shadow-color), 0px 1px 2px 0px var(--shadow-color)',
        elevation3: '0px 1px 3px 0px var(--shadow-color), 0px 4px 8px 3px var(--shadow-color)',
      },
      transitionTimingFunction: {
        emphasized: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        standard: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
        accelerate: 'cubic-bezier(0.3, 0.0, 1.0, 1.0)',
      },
    },
  },
  plugins: [],
};
