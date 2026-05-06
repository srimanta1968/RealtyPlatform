import type { Config } from 'tailwindcss';

import preset from '@kiana/design-system/tailwind-preset';

const config: Config = {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
