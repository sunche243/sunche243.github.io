import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/accountingnight/',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        invitation: `${projectRoot}index.html`,
        sponsor: `${projectRoot}sponsor/index.html`,
        admin: `${projectRoot}admin/index.html`,
      },
    },
  },
});
