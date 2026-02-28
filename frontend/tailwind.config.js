/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pump-bg': '#0b0f19',
        'pump-card': '#111827',
        'pump-green': '#22c55e',
        'pump-text': '#e5e7eb',
      },
      backgroundColor: {
        'gray-950': '#030712',
        'gray-900': '#111827',
        'gray-800': '#1f2937',
        'gray-700': '#374151',
      },
      borderColor: {
        'gray-700': '#374151',
      },
      textColor: {
        'gray-300': '#d1d5db',
        'gray-400': '#9ca3af',
        'gray-500': '#6b7280',
        'gray-600': '#4b5563',
      },
    },
  },
  plugins: [],
}

