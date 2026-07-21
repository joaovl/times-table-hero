// Generates e2e/support/catalog.json — a plain-data list of every module's
// skills (or operations) plus how to drive its setup screen — so the e2e
// every-option spec can emit one clearly-named test per option without
// importing module source (which uses @/ aliases the Playwright loader can't
// resolve). Run: node scripts/gen-e2e-catalog.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Per-module descriptors. `skillsExport` is the const whose string-array we
// extract from logic.ts. `heading` is the skills-card heading (or operation
// picker heading). `difficulty` = has an Easy/Medium/Hard selector.
const MODULES = [
  { slug: 'charts', route: '/charts', heading: 'Skill', skillsExport: 'CHART_SKILL_OPTIONS', difficulty: false },
  { slug: 'number-sense', route: '/number-sense', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: true },
  { slug: 'conversions', route: '/conversions', heading: 'Skills', skillsExport: 'CONVERSION_SKILL_OPTIONS', difficulty: true },
  { slug: 'word-problems', route: '/word-problems', heading: 'Skills', skillsExport: 'WORD_SKILL_OPTIONS', difficulty: true },
  { slug: 'algebra', route: '/algebra', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: true },
  { slug: 'statistics', route: '/statistics', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: true },
  { slug: 'ratio-proportion', route: '/ratio-proportion', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: true },
  { slug: 'time', route: '/time', heading: 'Skill', skillsExport: 'TIME_SKILL_OPTIONS', difficulty: true },
  { slug: 'decimals', route: '/decimals', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: false },
  { slug: 'fractions', route: '/fractions', heading: 'Skills', skillsExport: 'ALL_SKILLS', difficulty: false },
  { slug: 'shapes', route: '/shapes', heading: 'Skills', skillsExport: 'SHAPE_SKILL_OPTIONS', difficulty: true },
  { slug: 'money', route: '/money', heading: 'Skills', skillsExport: 'MONEY_SKILL_OPTIONS', difficulty: true },
  { slug: 'number-theory', route: '/number-theory', heading: 'Skills', skillsExport: 'NUMBER_THEORY_SKILL_OPTIONS', difficulty: true },
  // times-tables / arithmetic use an operation picker rather than skill chips.
  { slug: 'times-tables', route: '/times-tables', heading: 'Operation', operations: ['multiply', 'divide', 'square', 'sqrt'], difficulty: true },
  { slug: 'arithmetic', route: '/arithmetic', heading: 'Operation', operations: ['add', 'subtract', 'multiply', 'divide'], difficulty: true },
];

function extractArray(source, exportName) {
  // Match: export const NAME<...>= [ 'a', 'b', ... ];
  const re = new RegExp(`export const ${exportName}\\b[^=]*=\\s*\\[([\\s\\S]*?)\\]`);
  const m = source.match(re);
  if (!m) throw new Error(`could not find export const ${exportName}`);
  const items = [];
  const strRe = /['"]([^'"]+)['"]/g;
  let s;
  while ((s = strRe.exec(m[1]))) items.push(s[1]);
  return items;
}

const out = [];
for (const mod of MODULES) {
  const entry = { slug: mod.slug, route: mod.route, heading: mod.heading, difficulty: mod.difficulty };
  if (mod.operations) {
    entry.options = mod.operations;
    entry.kind = 'operation';
  } else {
    const logic = fs.readFileSync(path.join(ROOT, 'src', 'modules', mod.slug, 'logic.ts'), 'utf8');
    entry.options = extractArray(logic, mod.skillsExport);
    entry.kind = 'skill';
  }
  out.push(entry);
}

const dest = path.join(ROOT, 'e2e', 'support', 'catalog.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
const totalOptions = out.reduce((n, m) => n + m.options.length, 0);
console.log(`wrote ${dest}: ${out.length} modules, ${totalOptions} options`);
for (const m of out) console.log(`  ${m.slug}: ${m.options.length} ${m.kind}s${m.difficulty ? ' x3 levels' : ''}`);
