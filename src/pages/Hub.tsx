import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Palette, Clock, BarChart3, Hash, PoundSterling, Percent, Sigma, Ruler, BookOpen, Download, Scale, Variable, LineChart, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { PRESET_THEMES, DEFAULT_THEME, getTheme, saveTheme, resetTheme } from '@/lib/themeStorage';
import { useT } from '@/lib/i18n/react';
import { moduleAccent } from '@/lib/moduleAccent';
import type { MessageKey } from '@/lib/i18n/i18n';
import { useInstallPrompt } from '@/lib/pwa-install';

type YearFilter = 'all' | 3 | 4 | 5 | 6;

const YEAR_KEY = 'hub-year-filter';

// Each module's primary year coverage. Used by the Year picker to filter
// which cards are shown. Years are inclusive — a module tagged [3,4,5] is
// shown for any selection.
type ModuleCard = {
  slug: string;
  nameKey: MessageKey;
  blurbKey: MessageKey;
  glyph?: string;        // text glyph (preferred when available, monochrome by default)
  iconName?: 'clock' | 'bar-chart-3' | 'hash' | 'pound' | 'percent' | 'sigma' | 'ruler' | 'book-open' | 'scale' | 'variable' | 'line-chart';
  years: Array<3 | 4 | 5 | 6>;
};

const MODULES: ModuleCard[] = [
  { slug: 'times-tables', nameKey: 'hub.modules.times-tables.name', blurbKey: 'hub.modules.times-tables.blurb', glyph: '×', years: [3, 4, 5] },
  { slug: 'arithmetic', nameKey: 'hub.modules.arithmetic.name', blurbKey: 'hub.modules.arithmetic.blurb', glyph: '+', years: [3, 4, 5, 6] },
  { slug: 'time', nameKey: 'hub.modules.time.name', blurbKey: 'hub.modules.time.blurb', iconName: 'clock', years: [3, 4, 5] },
  { slug: 'fractions', nameKey: 'hub.modules.fractions.name', blurbKey: 'hub.modules.fractions.blurb', glyph: '¾', years: [3, 4, 5, 6] },
  { slug: 'shapes', nameKey: 'hub.modules.shapes.name', blurbKey: 'hub.modules.shapes.blurb', glyph: '⬡', years: [3, 4, 5, 6] },
  { slug: 'charts', nameKey: 'hub.modules.charts.name', blurbKey: 'hub.modules.charts.blurb', iconName: 'bar-chart-3', years: [3, 4, 5] },
  { slug: 'number-sense', nameKey: 'hub.modules.number-sense.name', blurbKey: 'hub.modules.number-sense.blurb', iconName: 'hash', years: [3, 4, 5, 6] },
  { slug: 'money', nameKey: 'hub.modules.money.name', blurbKey: 'hub.modules.money.blurb', iconName: 'pound', years: [3, 4, 5] },
  { slug: 'decimals', nameKey: 'hub.modules.decimals.name', blurbKey: 'hub.modules.decimals.blurb', iconName: 'percent', years: [4, 5] },
  { slug: 'number-theory', nameKey: 'hub.modules.number-theory.name', blurbKey: 'hub.modules.number-theory.blurb', iconName: 'sigma', years: [5] },
  { slug: 'conversions', nameKey: 'hub.modules.conversions.name', blurbKey: 'hub.modules.conversions.blurb', iconName: 'ruler', years: [4, 5] },
  { slug: 'word-problems', nameKey: 'hub.modules.word-problems.name', blurbKey: 'hub.modules.word-problems.blurb', iconName: 'book-open', years: [3, 4, 5] },
  { slug: 'ratio-proportion', nameKey: 'hub.modules.ratio-proportion.name', blurbKey: 'hub.modules.ratio-proportion.blurb', iconName: 'scale', years: [6] },
  { slug: 'algebra', nameKey: 'hub.modules.algebra.name', blurbKey: 'hub.modules.algebra.blurb', iconName: 'variable', years: [6] },
  { slug: 'statistics', nameKey: 'hub.modules.statistics.name', blurbKey: 'hub.modules.statistics.blurb', iconName: 'line-chart', years: [6] },
];

// Icons render in currentColor so the card's module accent flows through.
function ModuleIcon({ iconName }: { iconName: NonNullable<ModuleCard['iconName']> }) {
  const cls = 'w-14 h-14 md:w-[72px] md:h-[72px]';
  switch (iconName) {
    case 'clock': return <Clock className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'bar-chart-3': return <BarChart3 className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'hash': return <Hash className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'pound': return <PoundSterling className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'percent': return <Percent className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'sigma': return <Sigma className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'ruler': return <Ruler className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'book-open': return <BookOpen className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'scale': return <Scale className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'variable': return <Variable className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'line-chart': return <LineChart className={cls} strokeWidth={2.5} aria-hidden="true" />;
  }
}

function loadYear(): YearFilter {
  try {
    const v = localStorage.getItem(YEAR_KEY);
    if (v === '3' || v === '4' || v === '5' || v === '6') return Number(v) as 3 | 4 | 5 | 6;
  } catch {
    // localStorage may be unavailable (private mode); fall through.
  }
  return 'all';
}

function saveYear(y: YearFilter) {
  try {
    localStorage.setItem(YEAR_KEY, String(y));
  } catch {
    // silently ignore storage errors
  }
}

const Hub = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [yearFilter, setYearFilter] = useState<YearFilter>(loadYear);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canInstall, prompt: promptInstall } = useInstallPrompt();

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) setShowColorPicker(false);
  }, [showMenu]);

  const handleUserCreated = (userId: string) => {
    const u = getUserById(userId);
    if (u) setCurrentUser(u);
    setShowNewUserModal(false);
  };

  const visibleModules = useMemo(
    () => (yearFilter === 'all' ? MODULES : MODULES.filter(m => m.years.includes(yearFilter))),
    [yearFilter]
  );

  const pickYear = (y: YearFilter) => {
    setYearFilter(y);
    saveYear(y);
  };

  // WAI-ARIA radiogroup keyboard support: ArrowRight/Down move to the next
  // radio (wrapping), ArrowLeft/Up to the previous, Home/End jump to first
  // and last respectively. Activating the new radio updates the filter so
  // focus tracks the checked option (per the standard "single-tab" radio
  // pattern). Used by the Year picker below.
  const yearOrder: YearFilter[] = ['all', 3, 4, 5, 6];
  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: YearFilter) => {
    const idx = yearOrder.indexOf(current);
    if (idx < 0) return;
    let next: YearFilter | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = yearOrder[(idx + 1) % yearOrder.length];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = yearOrder[(idx - 1 + yearOrder.length) % yearOrder.length];
    } else if (e.key === 'Home') {
      next = yearOrder[0];
    } else if (e.key === 'End') {
      next = yearOrder[yearOrder.length - 1];
    }
    if (next !== null) {
      e.preventDefault();
      pickYear(next);
      // Move focus to the newly checked radio so it matches the tab order.
      const root = e.currentTarget.closest('[role="radiogroup"]');
      const btn = root?.querySelector<HTMLButtonElement>(`button[data-year="${next}"]`);
      btn?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-3 md:mb-6 flex items-center justify-between">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label={t('hub.menu.openAriaLabel')}
              aria-expanded={showMenu}
              className="text-muted-foreground hover:text-foreground transition-colors text-base flex items-center gap-1.5 min-h-[44px] px-2 -ml-2"
            >
              <Menu className="w-5 h-5" aria-hidden="true" /> {t('hub.menu.open')}
            </button>
            {showMenu && (
              <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                <div className="px-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 min-h-[44px]"
                  >
                    <Palette className="w-4 h-4" />
                    <div
                      className="w-4 h-4 rounded-full border border-card-border"
                      style={{
                        backgroundColor: currentTheme.customColors?.primary
                          ? `hsl(${currentTheme.customColors.primary})`
                          : `hsl(${currentTheme.hue}, 85%, 58%)`,
                      }}
                    />
                    {t('hub.menu.colors')}
                  </button>
                  {showColorPicker && (
                    <div className="px-2 py-2 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_THEMES.map((theme, idx) => (
                          <button
                            key={theme.hue || `custom-${idx}`}
                            onClick={() => {
                              saveTheme(theme);
                              setCurrentTheme(theme);
                            }}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:bg-muted',
                              currentTheme.name === theme.name && 'ring-2 ring-primary bg-muted'
                            )}
                          >
                            <div
                              className="w-11 h-11 rounded-full border border-card-border"
                              style={{
                                backgroundColor: theme.customColors?.primary
                                  ? `hsl(${theme.customColors.primary})`
                                  : `hsl(${theme.hue}, 85%, 58%)`,
                              }}
                            />
                            <span className="text-[9px] text-center text-muted-foreground leading-tight">
                              {theme.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          resetTheme();
                          setCurrentTheme(DEFAULT_THEME);
                        }}
                        className="w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      >
                        {t('hub.menu.resetDefault')}
                      </button>
                    </div>
                  )}
                  {canInstall && (
                    <button
                      onClick={() => {
                        void promptInstall();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      {t('hub.menu.installApp')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/parent');
                    }}
                    className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 min-h-[44px]"
                  >
                    <Lock className="w-4 h-4" />
                    {t('hub.menu.parentArea')}
                  </button>
                </div>
                <div className="border-t mt-1 pt-1.5 px-4 pb-1 text-[10px] text-muted-foreground/60">
                  {t('hub.version', { hash: (globalThis as unknown as { __GIT_HASH__?: string }).__GIT_HASH__ || 'dev' })}
                </div>
              </div>
            )}
          </div>
          <UserSelector
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            onNewUser={() => setShowNewUserModal(true)}
          />
        </div>

        <h1 className="text-[22px] md:text-[36px] font-bold text-primary flex items-center justify-center gap-2 mb-1 md:mb-2">
          <img src="/favicon.png" alt={t('hub.title')} className="w-6 h-6 md:w-10 md:h-10" />
          {t('hub.title')}
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3 md:mb-4">
          {currentUser ? t('hub.greeting', { name: currentUser.name }) : t('hub.greeting.noUser')}
        </p>

        <div
          role="radiogroup"
          aria-label={t('hub.year.ariaLabel')}
          className="mb-4 md:mb-6 flex items-center justify-center gap-2"
        >
          {(['all', 3, 4, 5, 6] as YearFilter[]).map(y => {
            const label = y === 'all' ? t('hub.year.all') : t('hub.year.numbered', { n: y });
            const active = yearFilter === y;
            return (
              <button
                key={String(y)}
                role="radio"
                aria-checked={active}
                // WAI-ARIA radiogroup pattern: only the checked radio is in
                // the tab order; arrow keys move focus inside the group.
                tabIndex={active ? 0 : -1}
                data-year={String(y)}
                onClick={() => pickYear(y)}
                onKeyDown={e => handleYearKeyDown(e, y)}
                className={cn(
                  'min-w-[52px] min-h-[40px] px-3 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  active
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {visibleModules.map(m => (
            <Card
              key={m.slug}
              onClick={() => navigate(`/${m.slug}`)}
              className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              <div className="flex justify-center mb-2">
                <div
                  className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-2xl"
                  style={{ color: moduleAccent(m.slug).color, backgroundColor: moduleAccent(m.slug).soft }}
                >
                  {m.glyph ? (
                    <span className="text-5xl md:text-6xl font-extrabold leading-none">{m.glyph}</span>
                  ) : (
                    <ModuleIcon iconName={m.iconName!} />
                  )}
                </div>
              </div>
              <div className="text-lg md:text-xl font-bold text-foreground text-center">{t(m.nameKey)}</div>
              <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
                {t(m.blurbKey)}
              </div>
            </Card>
          ))}
        </div>

        {visibleModules.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('hub.empty')}
          </p>
        )}
      </div>

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
};

export default Hub;
