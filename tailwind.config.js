/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta cálida VoyYa — espejo de BRAND_COLORS en packages/ui-mobile/src/tokens.ts
        // (frontend-yavoy). Se repite aquí a mano (son 6 constantes, no un contrato Zod)
        // para no depender de un paquete no vendorizado; si cambia la marca, actualizar ahí y aquí.
        amber: {
          DEFAULT: '#F4A21A',
          deep: '#E0850A',
        },
        espresso: '#2A2018',
        crema: '#FBF6ED',
        go: '#12A46A',
        danger: '#D6503F',
      },
    },
  },
  plugins: [],
};
