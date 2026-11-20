// Overí kontrast farebných párov dizajnového systému podľa WCAG 2.x (relatívna luminancia).
// Spustenie: npm run check:contrast. Pri zlyhaní skončí s kódom 1 (vhodné do CI).
const c = {
  white: '#FFFFFF', surface: '#F5F7F2', g950: '#0D2B1D', g900: '#113322', g700: '#3F7A1C', g600: '#478320',
  g500: '#5BA829', g400: '#78BE20', g50: '#EEF6E8', muted: '#5B6B62', control: '#7A8A80', success: '#2F6B1A',
  warning: '#B54708', warningBg: '#FFFAEB', danger: '#B42318', dangerBg: '#FEF3F2', info: '#1D4ED8', infoBg: '#EFF4FF',
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Biela s priehľadnosťou zložená na pozadie (napr. text-white/85 na tmavej ploche). */
const over = (alpha, bg) => '#' + [1, 3, 5].map((i) => Math.round(255 * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');

// [popis, popredie, pozadie, minimálny pomer] – 4,5 text, 3 veľký text a UI prvky
const pairs = [
  ['hlavný text na bielej', c.g950, c.white, 4.5],
  ['hlavný text na surface', c.g950, c.surface, 4.5],
  ['hlavný text na green-50', c.g950, c.g50, 4.5],
  ['biely text na green-950 (primárne CTA)', c.white, c.g950, 4.5],
  ['biely text na green-900 (pätička)', c.white, c.g900, 4.5],
  ['biely text 85 % na green-900', over(0.85, c.g900), c.g900, 4.5],
  ['biely text 85 % na green-950', over(0.85, c.g950), c.g950, 4.5],
  ['green-950 text na green-500 (brand CTA)', c.g950, c.g500, 4.5],
  ['green-950 text na green-400 (hover brand CTA)', c.g950, c.g400, 4.5],
  ['green-400 akcent na green-950', c.g400, c.g950, 4.5],
  ['green-400 akcent na green-900', c.g400, c.g900, 4.5],
  ['odkaz green-700 na bielej', c.g700, c.white, 4.5],
  ['odkaz green-700 na surface', c.g700, c.surface, 4.5],
  ['odkaz green-700 na green-50', c.g700, c.g50, 4.5],
  ['odkaz green-600 na bielej', c.g600, c.white, 4.5],
  ['text-muted na bielej', c.muted, c.white, 4.5],
  ['text-muted na surface', c.muted, c.surface, 4.5],
  ['text-muted na green-50', c.muted, c.g50, 4.5],
  ['border-control na bielej (UI)', c.control, c.white, 3],
  ['border-control na surface (UI)', c.control, c.surface, 3],
  ['success na bielej', c.success, c.white, 4.5],
  ['success na green-50', c.success, c.g50, 4.5],
  ['warning na warning-bg', c.warning, c.warningBg, 4.5],
  ['danger na bielej', c.danger, c.white, 4.5],
  ['danger na danger-bg', c.danger, c.dangerBg, 4.5],
  ['info na info-bg', c.info, c.infoBg, 4.5],
  ['fokus green-950 na bielej (UI)', c.g950, c.white, 3],
  ['fokus green-400 na green-900 (UI)', c.g400, c.g900, 3],
];
// Zakázané kombinácie: musia zlyhať, inak je tabuľka tokenov nesprávna.
const forbidden = [
  ['biely text na green-500', c.white, c.g500],
  ['biely text na green-400', c.white, c.g400],
  ['green-600 text na surface', c.g600, c.surface],
];

let failed = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (min ${min}) ${name}`);
}
for (const [name, fg, bg] of forbidden) {
  const r = ratio(fg, bg);
  console.log(`---- ${r.toFixed(2).padStart(5)}:1 zakázané: ${name}${r >= 4.5 ? '  (pozor: prechádza, skontrolujte pravidlo)' : ''}`);
}
if (failed) {
  console.error(`\n${failed} párov neprechádza WCAG 2.2 AA.`);
  process.exit(1);
}
console.log('\nVšetky páry prechádzajú WCAG 2.2 AA.');
