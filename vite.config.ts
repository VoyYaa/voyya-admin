import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Config mínima: sin proxy — la consola llama directo a VITE_API_URL (el backend
// debe habilitar CORS para el origen de esta app; fuera de alcance de este repo).
export default defineConfig({
  plugins: [react()],
});
