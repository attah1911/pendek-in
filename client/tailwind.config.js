/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0C0C0E',
        surface: '#141416',
        'surface-2': '#1C1C1F',
        border: '#2A2A2F',
        'border-focus': '#4A4A55',
        primary: '#EAEAEC',
        secondary: '#8A8A96',
        muted: '#55555F',
        accent: { DEFAULT: '#6E6BF0', dim: '#6E6BF014', hover: '#8A87F5' },
        success: '#2ECC71',
        warning: '#F0A500',
        danger: { DEFAULT: '#E05252', dim: '#E0525214' },
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
