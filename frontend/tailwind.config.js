/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          light: '#2c5282',
          dark: '#152943',
        },
        accent: {
          DEFAULT: '#38b2ac',
          hover: '#319795',
        },
        success: {
          DEFAULT: '#48bb78',
          hover: '#38a169',
        },
        warning: {
          DEFAULT: '#ed8936',
          hover: '#dd6b20',
        },
        danger: {
          DEFAULT: '#f56565',
          hover: '#e53e3e',
        },
        surface: {
          bg: '#f7fafc',
          card: '#ffffff',
          muted: '#edf2f7',
        },
        brand: {
          text: '#2d3748',
          textLight: '#718096',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
