/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rentPrimary: '#e3845b', 
        rentSecondary: '#8cb369', 
        rentBg: '#fef5e7', 
      }
    },
  },
  plugins: [],
}
