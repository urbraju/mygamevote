/**
 * Tailwind Configuration
 * 
 * Defines the custom "Clean and Sporty" theme colors and fonts.
 * Configures the content paths for NativeWind to scan.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: '#00E5FF', // Neon Cyan
        secondary: '#00B8D4', // Deeper Cyan
        accent: '#39FF14', // Neon Green for highlights
        background: '#0A0E14', // Stadium Night (Deep Navy/Black)
        surface: '#121826', // Pro Card Background
        success: '#10B981',
        danger: '#EF4444',
        'white-10': 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
