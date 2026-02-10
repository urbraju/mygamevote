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
  theme: {
    extend: {
      colors: {
        primary: '#2563EB', // Royal Blue
        secondary: '#1E40AF', // Darker Blue
        accent: '#F59E0B', // Amber/Gold for highlights
        background: '#F3F4F6', // Light Gray
        surface: '#FFFFFF',
        success: '#10B981',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
