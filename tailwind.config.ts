import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07131e',
        panel: '#102231',
        line: '#254253',
        mint: '#6ee7c0',
        sky: '#6eb7e7',
        amber: '#f4c273',
      },
      fontFamily: { sans: ['Arial', 'Helvetica', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
