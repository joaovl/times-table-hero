/**
 * en-GB — source of truth.
 *
 * Keys are namespaced by module/area, separated by dots:
 *   hub.*               Hub screen (module picker)
 *   common.*            Shared button labels and stock phrases
 *   arithmetic.*        Arithmetic module
 *   times-tables.*      Times Tables module
 *   ... etc per module
 *
 * Placeholders use `{name}` syntax (see `interpolate` in `i18n.ts`).
 *
 * Keep this file alphabetically grouped by namespace. Other locales fall
 * back to these strings — please don't remove keys without checking usage.
 */
const enGB: Record<string, string> = {
  // ---- Hub ---------------------------------------------------------------
  'hub.title': 'Maths Challenge',
  'hub.greeting': 'Hi {name}! Pick what to practise today',
  'hub.greeting.noUser': 'Pick what to practise today',
  'hub.year.label': 'School year',
  'hub.year.all': 'All',
  'hub.year.3': 'Y3',
  'hub.year.4': 'Y4',
  'hub.year.5': 'Y5',
  'hub.empty': 'No modules tagged for this year yet.',

  // Module cards on the Hub
  'hub.module.times-tables.title': 'Times Tables',
  'hub.module.times-tables.subtitle': '×  ÷  x²  √ · Tables 1–12',
  'hub.module.arithmetic.title': 'Arithmetic',
  'hub.module.arithmetic.subtitle': '+  −  ×  ÷ · 1–5 digits',
  'hub.module.time.title': 'Time',
  'hub.module.time.subtitle': 'Read analog clocks · Roman · durations',
  'hub.module.fractions.title': 'Fractions',
  'hub.module.fractions.subtitle': '+ − × · same and different denominators',
  'hub.module.shapes.title': 'Shapes',
  'hub.module.shapes.subtitle': '2D · 3D · angles · area · coords',
  'hub.module.charts.title': 'Charts',
  'hub.module.charts.subtitle': 'Bar · pie · line · timetable',
  'hub.module.number-sense.title': 'Number Sense',
  'hub.module.number-sense.subtitle': 'Place value · rounding · Roman · Y3–Y5',
  'hub.module.money.title': 'Money',
  'hub.module.money.subtitle': 'Add · change · totals · compare prices',
  'hub.module.decimals.title': 'Decimals',
  'hub.module.decimals.subtitle': 'Decimals · percentages · rounding · Y4–Y5',
  'hub.module.number-theory.title': 'Number Theory',
  'hub.module.number-theory.subtitle': 'Factors · multiples · primes · squares',
  'hub.module.conversions.title': 'Conversions',
  'hub.module.conversions.subtitle': 'Units · perimeter · area · volume',
  'hub.module.word-problems.title': 'Word Problems',
  'hub.module.word-problems.subtitle': 'One- and two-step problems · Y3–Y5',

  // Menu
  'hub.menu.open': 'Menu',
  'hub.menu.colors': 'Colors',
  'hub.menu.install': 'Install app',
  'hub.menu.reset': 'Reset to Default',

  // ---- Common ------------------------------------------------------------
  'common.lets-go': "Let's Go!",
  'common.print': 'Print Worksheet',
  'common.cancel': 'Cancel',
  'common.back': '← Back',
  'common.quit': '← Quit',
  'common.check': 'Check',
  'common.next': 'Next',
  'common.brilliant': 'Brilliant!',

  // ---- Arithmetic module setup -------------------------------------------
  'arithmetic.setup.title': 'Arithmetic',
  'arithmetic.setup.subtitle': 'Pick an operation and difficulty',
  'arithmetic.op.add': 'Add',
  'arithmetic.op.subtract': 'Subtract',
  'arithmetic.op.multiply': 'Multiply',
  'arithmetic.op.divide': 'Divide',
};

export default enGB;
