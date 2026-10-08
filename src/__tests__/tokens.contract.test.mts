import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const requireFromRoot = createRequire(join(ROOT, 'package.json'));

interface ColorTree {
  [key: string]: string | ColorTree;
}

interface TailwindConfigShape {
  theme: {
    extend: {
      colors: ColorTree;
      borderWidth: Record<string, string>;
      boxShadow: Record<string, string>;
      fontSize: Record<string, unknown>;
    };
  };
}

const tailwindConfig = requireFromRoot('./tailwind.config.js') as TailwindConfigShape;
const colors = tailwindConfig.theme.extend.colors;
const css = readFileSync(join(ROOT, 'src/index.css'), 'utf-8');
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf-8');

const BRAND_PRIMITIVES: ReadonlyArray<readonly [string, string]> = [
  ['amber-500', '#F4A21A'],
  ['amber-600', '#E0850A'],
  ['amber-900', '#6B4505'],
  ['amber-100', '#FCE9C6'],
  ['espresso-900', '#2A2018'],
  ['espresso-800', '#3A2D21'],
  ['espresso-700', '#4A3A2C'],
  ['espresso-600', '#5C4A3A'],
  ['espresso-500', '#6B5A47'],
  ['cream-50', '#FBF6ED'],
  ['cream-100', '#F3EAD9'],
  ['cream-200', '#EADFC9'],
  ['sand-600', '#8F7F68'],
  ['green-500', '#12A46A'],
  ['green-800', '#0A6A44'],
  ['green-100', '#DDF1E7'],
  ['red-500', '#D6503F'],
  ['red-700', '#B23A2C'],
  ['red-800', '#A63325'],
  ['red-100', '#F6DED4'],
  ['blue-600', '#2D6A8E'],
  ['blue-800', '#1F5272'],
  ['blue-100', '#DCEBF3'],
];

function colorAt(path: string): string {
  let node: string | ColorTree = colors;
  for (const segment of path.split('.')) {
    assert.ok(typeof node === 'object', `slot ${path} no existe`);
    const next: string | ColorTree | undefined = node[segment];
    assert.ok(next !== undefined, `slot ${path} no existe`);
    node = next;
  }
  assert.ok(typeof node === 'string', `slot ${path} no es un color`);
  return node;
}

function readCssVars(blockSelector: string): Record<string, string> {
  const start = css.indexOf(`${blockSelector} {`);
  assert.ok(start >= 0, `bloque ${blockSelector} no encontrado`);
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--color-[a-z-]+):\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value) vars[name] = value.trim();
  }
  return vars;
}

const LIGHT_VARS = readCssVars(':root');
const DARK_VARS = readCssVars('.dark');

type Rgb = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  assert.equal(normalized.length, 6, `hex inválido: ${hex}`);
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function blendOver(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return [
    Math.round(background[0] + (foreground[0] - background[0]) * alpha),
    Math.round(background[1] + (foreground[1] - background[1]) * alpha),
    Math.round(background[2] + (foreground[2] - background[2]) * alpha),
  ];
}

function channelLuminance(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb[0]) +
    0.7152 * channelLuminance(rgb[1]) +
    0.0722 * channelLuminance(rgb[2])
  );
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  assert.ok(light !== undefined && dark !== undefined);
  return (light + 0.05) / (dark + 0.05);
}

const TEXT = 4.5;
const GRAPHIC = 3;

interface ContrastPair {
  name: string;
  foreground: string;
  background: string;
  minimum: number;
}

const LIGHT_PAIRS: readonly ContrastPair[] = [
  { name: 'text / bg', foreground: '#2A2018', background: '#FBF6ED', minimum: TEXT },
  { name: 'text / surface', foreground: '#2A2018', background: '#FFFFFF', minimum: TEXT },
  { name: 'text / surfaceSunken', foreground: '#2A2018', background: '#F3EAD9', minimum: TEXT },
  { name: 'textMuted / bg', foreground: '#5C4A3A', background: '#FBF6ED', minimum: TEXT },
  {
    name: 'textMuted / surfaceSunken',
    foreground: '#5C4A3A',
    background: '#F3EAD9',
    minimum: TEXT,
  },
  { name: 'textMuted / brandTint', foreground: '#5C4A3A', background: '#FCE9C6', minimum: TEXT },
  { name: 'textSubtle / bg', foreground: '#6B5A47', background: '#FBF6ED', minimum: TEXT },
  { name: 'textSubtle / surface', foreground: '#6B5A47', background: '#FFFFFF', minimum: TEXT },
  {
    name: 'textSubtle / surfaceSunken',
    foreground: '#6B5A47',
    background: '#F3EAD9',
    minimum: TEXT,
  },
  { name: 'onBrand / brand', foreground: '#2A2018', background: '#F4A21A', minimum: TEXT },
  { name: 'onBrand / brandPressed', foreground: '#2A2018', background: '#E0850A', minimum: TEXT },
  { name: 'brandInk / bg', foreground: '#6B4505', background: '#FBF6ED', minimum: TEXT },
  { name: 'brandInk / brandTint', foreground: '#6B4505', background: '#FCE9C6', minimum: TEXT },
  { name: 'onSuccess / success', foreground: '#2A2018', background: '#12A46A', minimum: TEXT },
  {
    name: 'onSuccessSolid / successSolid',
    foreground: '#FFFFFF',
    background: '#0D774D',
    minimum: TEXT,
  },
  { name: 'successInk / successTint', foreground: '#0A6A44', background: '#DDF1E7', minimum: TEXT },
  { name: 'successInk / bg', foreground: '#0A6A44', background: '#FBF6ED', minimum: TEXT },
  { name: 'dangerInk / dangerTint', foreground: '#A63325', background: '#F6DED4', minimum: TEXT },
  { name: 'dangerInk / bg', foreground: '#A63325', background: '#FBF6ED', minimum: TEXT },
  { name: 'onDanger / dangerSolid', foreground: '#FFFFFF', background: '#B23A2C', minimum: TEXT },
  { name: 'danger / bg (gráfico)', foreground: '#D6503F', background: '#FBF6ED', minimum: GRAPHIC },
  { name: 'infoInk / infoTint', foreground: '#1F5272', background: '#DCEBF3', minimum: TEXT },
  { name: 'info / bg', foreground: '#2D6A8E', background: '#FBF6ED', minimum: GRAPHIC },
  {
    name: 'borderStrong / surface',
    foreground: '#8F7F68',
    background: '#FFFFFF',
    minimum: GRAPHIC,
  },
  { name: 'borderStrong / bg', foreground: '#8F7F68', background: '#FBF6ED', minimum: GRAPHIC },
  {
    name: 'borderStrong / surfaceSunken',
    foreground: '#8F7F68',
    background: '#F3EAD9',
    minimum: GRAPHIC,
  },
  { name: 'focusRing / bg', foreground: '#2A2018', background: '#FBF6ED', minimum: GRAPHIC },
];

const DARK_PAIRS: readonly ContrastPair[] = [
  { name: 'text / bg', foreground: '#FBF6ED', background: '#1C140D', minimum: TEXT },
  { name: 'text / surface', foreground: '#FBF6ED', background: '#2A2018', minimum: TEXT },
  { name: 'text / surfaceRaised', foreground: '#FBF6ED', background: '#352A1F', minimum: TEXT },
  { name: 'textMuted / surface', foreground: '#CBBFAD', background: '#2A2018', minimum: TEXT },
  {
    name: 'textMuted / surfaceRaised',
    foreground: '#CBBFAD',
    background: '#352A1F',
    minimum: TEXT,
  },
  { name: 'textSubtle / surface', foreground: '#A39580', background: '#2A2018', minimum: TEXT },
  {
    name: 'textSubtle / surfaceRaised',
    foreground: '#A39580',
    background: '#352A1F',
    minimum: TEXT,
  },
  { name: 'brandInk / surface', foreground: '#F4A21A', background: '#2A2018', minimum: TEXT },
  { name: 'brandInk / surfaceRaised', foreground: '#F4A21A', background: '#352A1F', minimum: TEXT },
  { name: 'successInk / surface', foreground: '#22C285', background: '#2A2018', minimum: TEXT },
  { name: 'dangerInk / surface', foreground: '#E8705C', background: '#2A2018', minimum: TEXT },
  {
    name: 'dangerInk / surfaceRaised',
    foreground: '#E8705C',
    background: '#352A1F',
    minimum: TEXT,
  },
  { name: 'dangerInk / dangerTint', foreground: '#E8705C', background: '#3A211B', minimum: TEXT },
  { name: 'infoInk / surface', foreground: '#7DB8D8', background: '#2A2018', minimum: TEXT },
  {
    name: 'borderStrong / surface',
    foreground: '#8A7A66',
    background: '#2A2018',
    minimum: GRAPHIC,
  },
  {
    name: 'borderStrong / surfaceRaised',
    foreground: '#8A7A66',
    background: '#352A1F',
    minimum: GRAPHIC,
  },
  { name: 'focusRing / surface', foreground: '#FBF6ED', background: '#2A2018', minimum: GRAPHIC },
];

const STAGE_PAIRS: readonly ContrastPair[] = [
  { name: 'onStage / stage', foreground: '#FBF6ED', background: '#2A2018', minimum: TEXT },
  { name: 'onStageMuted / stage', foreground: '#CBBFAD', background: '#2A2018', minimum: TEXT },
  {
    name: 'onStageMuted / stageRaised',
    foreground: '#CBBFAD',
    background: '#352A1F',
    minimum: TEXT,
  },
  { name: 'brand / stage', foreground: '#F4A21A', background: '#2A2018', minimum: GRAPHIC },
  { name: 'success / stage', foreground: '#12A46A', background: '#2A2018', minimum: GRAPHIC },
  { name: 'danger / stage', foreground: '#D6503F', background: '#2A2018', minimum: GRAPHIC },
  { name: 'onBrand / brand (stage)', foreground: '#2A2018', background: '#F4A21A', minimum: TEXT },
];

function assertPairs(pairs: readonly ContrastPair[]): void {
  for (const pair of pairs) {
    const ratio = contrastRatio(parseHex(pair.foreground), parseHex(pair.background));
    assert.ok(
      ratio >= pair.minimum,
      `${pair.name}: ${ratio.toFixed(2)}:1 está bajo el umbral ${pair.minimum}:1`,
    );
  }
}

const BRAND_ON_CREAM_FORBIDDEN_AS_TEXT: readonly ContrastPair[] = [
  { name: 'brand / bg', foreground: '#F4A21A', background: '#FBF6ED', minimum: 0 },
  { name: 'brandPressed / bg', foreground: '#E0850A', background: '#FBF6ED', minimum: 0 },
];

const CONSOLE_SLOT_BINDINGS: ReadonlyArray<readonly [string, () => string]> = [
  ['amber-500 -> amber.DEFAULT', () => colorAt('amber.DEFAULT')],
  ['amber-600 -> amber.deep', () => colorAt('amber.deep')],
  ['amber-900 -> amber-ink', () => colorAt('amber-ink')],
  ['espresso-900 -> espresso', () => colorAt('espresso')],
  ['espresso-900 -> frame.bg', () => colorAt('frame.bg')],
  ['cream-50 -> crema', () => colorAt('crema')],
  ['green-500 -> success.DEFAULT', () => colorAt('success.DEFAULT')],
  ['green-500 -> go', () => colorAt('go')],
  ['green-800 -> success.ink', () => colorAt('success.ink.DEFAULT')],
  ['green-100 -> success.tint', () => colorAt('success.tint')],
  ['red-500 -> danger.DEFAULT', () => colorAt('danger.DEFAULT')],
  ['red-700 -> danger.solid', () => colorAt('danger.solid')],
  ['red-800 -> danger.ink', () => colorAt('danger.ink.DEFAULT')],
  ['red-100 -> danger.tint', () => colorAt('danger.tint')],
  ['blue-600 -> info.DEFAULT', () => colorAt('info.DEFAULT')],
  ['blue-800 -> info.ink', () => colorAt('info.ink.DEFAULT')],
  ['blue-100 -> info.tint', () => colorAt('info.tint')],
  ['espresso-900 -> on-success', () => colorAt('on-success')],
];

function primitiveHex(name: string): string {
  const found = BRAND_PRIMITIVES.find(([key]) => key === name);
  assert.ok(found, `primitiva ${name} no existe`);
  return found[1];
}

describe('tokens de marca de la consola (ADR-026)', () => {
  it('la lista de primitivas coincide con la de tokens §2.1', () => {
    assert.equal(BRAND_PRIMITIVES.length, 23);
    for (const [, hex] of BRAND_PRIMITIVES) assert.match(hex, /^#[0-9A-F]{6}$/);
  });

  it('cada slot de Tailwind usa el hex de su primitiva', () => {
    for (const [binding, read] of CONSOLE_SLOT_BINDINGS) {
      const primitive = binding.split(' -> ')[0] ?? '';
      assert.equal(read().toUpperCase(), primitiveHex(primitive), binding);
    }
  });

  it('las variables CSS claras usan los hex de la tabla', () => {
    assert.equal(LIGHT_VARS['--color-bg']?.toUpperCase(), primitiveHex('cream-50'));
    assert.equal(LIGHT_VARS['--color-bg-shell']?.toUpperCase(), primitiveHex('cream-100'));
    assert.equal(LIGHT_VARS['--color-text']?.toUpperCase(), primitiveHex('espresso-900'));
    assert.equal(LIGHT_VARS['--color-text-muted']?.toUpperCase(), primitiveHex('espresso-600'));
    assert.equal(LIGHT_VARS['--color-text-subtle']?.toUpperCase(), primitiveHex('espresso-500'));
    assert.equal(LIGHT_VARS['--color-border-control']?.toUpperCase(), primitiveHex('sand-600'));
    assert.equal(LIGHT_VARS['--color-on-brand']?.toUpperCase(), primitiveHex('espresso-900'));
  });

  it('las variables CSS oscuras siguen la receta recalculada', () => {
    assert.equal(DARK_VARS['--color-bg']?.toUpperCase(), '#1C140D');
    assert.equal(DARK_VARS['--color-surface']?.toUpperCase(), '#2A2018');
    assert.equal(DARK_VARS['--color-surface-sunken']?.toUpperCase(), '#231A12');
    assert.equal(DARK_VARS['--color-text']?.toUpperCase(), '#FBF6ED');
    assert.equal(DARK_VARS['--color-text-muted']?.toUpperCase(), '#CBBFAD');
    assert.equal(DARK_VARS['--color-text-subtle']?.toUpperCase(), '#A39580');
    assert.equal(DARK_VARS['--color-border-control']?.toUpperCase(), '#8A7A66');
  });

  it('los slots nuevos de ADR-026 existen', () => {
    assert.ok(colors.border && typeof colors.border === 'object' && 'control' in colors.border);
    assert.ok('info' in colors);
    assert.equal(colorAt('success.tint').toUpperCase(), '#DDF1E7');
    assert.ok('stat' in tailwindConfig.theme.extend.fontSize);
    assert.equal(tailwindConfig.theme.extend.borderWidth['rail'], '3px');
  });

  it('solo existen los slots de color aprobados y las sombras de overlay están retiradas', () => {
    const approved = [
      'amber',
      'amber-ink',
      'espresso',
      'crema',
      'go',
      'success',
      'danger',
      'info',
      'bg',
      'surface',
      'border',
      'text',
      'on-brand',
      'on-success',
      'focus',
      'status-neutral',
      'frame',
    ];
    assert.deepEqual(Object.keys(colors).sort(), [...approved].sort());
    assert.ok(!('overlay-sm' in tailwindConfig.theme.extend.boxShadow));
    assert.ok(!('overlay-lg' in tailwindConfig.theme.extend.boxShadow));
  });

  it('Google Fonts no se carga y las fuentes son autoalojadas', () => {
    assert.doesNotMatch(indexHtml, /fonts\.g(oogleapis|static)/);
    assert.match(css, /'Nunito Variable'/);
    assert.match(css, /'Nunito Sans Variable'/);
    assert.match(css, /'JetBrains Mono Variable'/);
  });
});

describe('contraste AA (tokens §3)', () => {
  it('claro', () => assertPairs(LIGHT_PAIRS));
  it('oscuro', () => assertPairs(DARK_PAIRS));
  it('sobre stage espresso', () => assertPairs(STAGE_PAIRS));

  it('el tinte de marca oscuro mantiene el texto de acento legible', () => {
    const tint = blendOver(parseHex('#F4A21A'), 0.14, parseHex('#2A2018'));
    assert.ok(contrastRatio(parseHex('#F4A21A'), tint) >= TEXT);
  });

  it('ámbar y ámbar presionado sobre crema siguen prohibidos como texto', () => {
    for (const pair of BRAND_ON_CREAM_FORBIDDEN_AS_TEXT) {
      const ratio = contrastRatio(parseHex(pair.foreground), parseHex(pair.background));
      assert.ok(ratio < TEXT, `${pair.name} dejó de ser un par prohibido (${ratio.toFixed(2)}:1)`);
    }
  });

  it('las variables CSS reales cumplen los umbrales en ambos temas', () => {
    const slotPairs: ReadonlyArray<readonly [string, string, number]> = [
      ['--color-text', '--color-bg', TEXT],
      ['--color-text', '--color-surface', TEXT],
      ['--color-text', '--color-bg-shell', TEXT],
      ['--color-text-muted', '--color-bg', TEXT],
      ['--color-text-muted', '--color-surface-sunken', TEXT],
      ['--color-text-muted', '--color-bg-shell', TEXT],
      ['--color-text-subtle', '--color-surface', TEXT],
      ['--color-text-subtle', '--color-surface-sunken', TEXT],
      ['--color-border-control', '--color-surface', GRAPHIC],
      ['--color-border-control', '--color-bg', GRAPHIC],
      ['--color-border-control', '--color-surface-sunken', GRAPHIC],
      ['--color-focus-ring', '--color-bg', GRAPHIC],
      ['--color-on-brand', colorAt('amber.DEFAULT'), TEXT],
    ];
    for (const [theme, vars] of [
      ['claro', LIGHT_VARS],
      ['oscuro', DARK_VARS],
    ] as const) {
      for (const [foregroundKey, backgroundKey, minimum] of slotPairs) {
        const foreground = vars[foregroundKey];
        const background = backgroundKey.startsWith('#') ? backgroundKey : vars[backgroundKey];
        assert.ok(foreground && background, `${theme}: falta ${foregroundKey} o ${backgroundKey}`);
        const ratio = contrastRatio(parseHex(foreground), parseHex(background));
        assert.ok(
          ratio >= minimum,
          `${theme}: ${foregroundKey} / ${backgroundKey} = ${ratio.toFixed(2)}:1 < ${minimum}:1`,
        );
      }
    }
  });
});
