/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: { DEFAULT: '#F4A21A', deep: '#E0850A' },
        'amber-ink': '#6B4505',
        espresso: '#2A2018',
        crema: '#FBF6ED',
        go: '#12A46A',
        success: { DEFAULT: '#12A46A', ink: { DEFAULT: '#0C7048', dark: '#22C285' } },
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
        frame: {
          bg: '#2A2018',
          text: '#FBF6ED',
          'text-muted': 'rgba(251, 246, 237, 0.65)',
          border: 'rgba(251, 246, 237, 0.14)',
          'chip-bg': 'rgba(251, 246, 237, 0.08)',
          'chip-border': 'rgba(251, 246, 237, 0.16)',
          'active-bg': 'rgba(244, 162, 26, 0.16)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['30px', { lineHeight: '36px', fontWeight: '800' }],
        title: ['18px', { lineHeight: '24px', fontWeight: '700' }],
        eyebrow: ['11px', { lineHeight: '16px', fontWeight: '800', letterSpacing: '0.10em' }],
        btn: ['13px', { lineHeight: '20px', fontWeight: '700' }],
        body: ['13px', { lineHeight: '20px' }],
        small: ['11px', { lineHeight: '16px' }],
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
        'brand-halo': '0 0 0 4px rgba(244, 162, 26, 0.24)',
      },
    },
  },
  plugins: [],
};
