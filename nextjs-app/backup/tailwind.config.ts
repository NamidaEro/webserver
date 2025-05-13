import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'wow-epic': '#a335ee',
        'wow-rare': '#0070dd',
        'wow-uncommon': '#1eff00',
        'wow-common': '#ffffff',
        'wow-poor': '#9d9d9d',
        'blizzard-blue': '#0074e0',
      },
    },
  },
  plugins: [],
}

export default config 