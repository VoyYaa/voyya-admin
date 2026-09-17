import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@voyyaa/shared'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /voyya-shared/],
      transformMixedEsModules: true,
    },
  },
});
