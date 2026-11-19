/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "Morning Bake" palette
        cream: '#FFF8F0',
        peachBorder: '#FCE3CF',
        apricot: '#F4A261',
        peach: '#FFCBA4',
        burntSugar: '#E07A3F',
        tangerine: '#FFB677',
        butter: '#FFE5B4',
        espresso: '#3D2C24',
        muted: '#8A7266',
        sage: { DEFAULT: '#A8C8A0', ink: '#4F7A47' },
        honey: { DEFAULT: '#F6C667', ink: '#8F6A12' },
        terracotta: { DEFAULT: '#E3836B', ink: '#B4533C' },
        latte: '#B08968',
        // "Night Shift" dark mode
        cocoa: { DEFAULT: '#2A1F1A', card: '#36281F', border: '#4B372B', text: '#F5E6DA', muted: '#C4AB9A' },
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        soft: '0 1px 2px rgba(61,44,36,0.04), 0 6px 20px -8px rgba(224,122,63,0.18)',
      },
    },
  },
  plugins: [],
};
