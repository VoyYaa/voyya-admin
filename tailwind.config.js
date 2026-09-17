/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: { DEFAULT: '#F4A21A', deep: '#E0850A' },
        espresso: '#2A2018',
        crema: '#FBF6ED',
        go: '#12A46A',
        success: { DEFAULT: '#12A46A', ink: { dark: '#22C285' } },
        danger: {
          DEFAULT: '#D6503F',
          tint: '#F6DED4',
          ink: { DEFAULT: '#B23A2C', dark: '#E8705C' },
        },
        bg: { DEFAULT: 'var(--color-bg)', shell: 'var(--color-bg-shell)' },
        surface: { DEFAULT: 'var(--color-surface)', sunken: 'var(--color-surface-sunken)' },
        border: 'var(--color-border)',
        text: { DEFAULT: 'var(--color-text)', muted: 'var(--color-text-muted)' },
        'on-brand': 'var(--color-on-brand)',
        'on-success': '#FFFFFF',
        focus: { ring: 'var(--color-focus-ring)', halo: 'var(--color-focus-halo)' },
        'status-neutral': 'var(--color-status-neutral)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['20px', { lineHeight: '26px', fontWeight: '700' }],
        title: ['16px', { lineHeight: '22px', fontWeight: '600' }],
        btn: ['14px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        small: ['12px', { lineHeight: '16px' }],
        'table-header': [
          '11px',
          { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.04em' },
        ],
      },
      spacing: {
        'row-sm': '32px',
        'row-md': '40px',
        'row-lg': '48px',
      },
      borderRadius: { xs: '4px', sm: '6px', md: '8px', lg: '12px' },
      boxShadow: {
        'overlay-sm': '0 2px 8px rgba(42, 32, 24, 0.14)',
        'overlay-lg': '0 12px 32px rgba(42, 32, 24, 0.22)',
      },
    },
  },
  plugins: [],
};
