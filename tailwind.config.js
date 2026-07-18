/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './case-studies/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        slab: ['"Zilla Slab"', 'serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#1f2a4f',
          light: '#2d3d74',
        },
        ink: '#11172a',
        accent: {
          DEFAULT: '#ffb719',
          light: '#ffc74c',
          soft: '#ffd77f',
        },
      },
    },
  },
  plugins: [],
}
