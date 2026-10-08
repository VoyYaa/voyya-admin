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
        success: {
          DEFAULT: '#12A46A',
          tint: '#DDF1E7',
          ink: { DEFAULT: '#0A6A44', dark: '#22C285' },
        },
        danger: {
          DEFAULT: '#D6503F',
          tint: '#F6DED4',
          solid: '#B23A2C',
          ink: { DEFAULT: '#A63325', dark: '#E8705C' },
        },
        info: {
          DEFAULT: '#2D6A8E',
          tint: '#DCEBF3',
          ink: { DEFAULT: '#1F5272', dark: '#7DB8D8' },
        },
        bg: { DEFAULT: 'var(--color-bg)', shell: 'var(--color-bg-shell)' },
        surface: { DEFAULT: 'var(--color-surface)', sunken: 'var(--color-surface-sunken)' },
        border: {
          DEFAULT: 'var(--color-border)',
          input: 'var(--color-border-input)',
          control: 'var(--color-border-control)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        'on-brand': 'var(--color-on-brand)',
        'on-success': '#2A2018',
        focus: { ring: 'var(--color-focus-ring)', halo: 'var(--color-focus-halo)' },
        'status-neutral': 'var(--color-status-neutral)',
        frame: {
          bg: '#2A2018',
          text: '#FBF6ED',
          'text-muted': '#CBBFAD',
          border: 'rgba(251, 246, 237, 0.14)',
          'chip-bg': '#352A1F',
          'chip-border': 'rgba(251, 246, 237, 0.10)',
          'active-bg': 'rgba(244, 162, 26, 0.16)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-rounded', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        hero: [
          'clamp(1.75rem, 1.3rem + 2vw, 2.5rem)',
          { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.03em' },
        ],
        stat: ['32px', { lineHeight: '32px', fontWeight: '900', letterSpacing: '-0.02em' }],
        display: ['28px', { lineHeight: '31px', fontWeight: '800', letterSpacing: '-0.02em' }],
        title: ['17px', { lineHeight: '22px', fontWeight: '700' }],
        lede: ['16px', { lineHeight: '26px', fontWeight: '400' }],
        eyebrow: ['11px', { lineHeight: '16px', fontWeight: '800', letterSpacing: '0.12em' }],
        btn: ['14px', { lineHeight: '20px', fontWeight: '700' }],
        body: ['15px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '18px' }],
        'table-header': [
          '11px',
          { lineHeight: '16px', fontWeight: '800', letterSpacing: '0.12em' },
        ],
      },
      spacing: {
        'row-sm': '32px',
        'row-md': '40px',
        'row-lg': '48px',
        tap: '44px',
        'tap-compact': '36px',
      },
      borderRadius: { xs: '12px', sm: '14px', md: '18px', lg: '20px', item: '14px', tile: '11px' },
      borderWidth: { rail: '3px' },
      boxShadow: {
        'brand-halo': '0 0 0 4px rgba(244, 162, 26, 0.24)',
      },
    },
  },
  plugins: [],
};
