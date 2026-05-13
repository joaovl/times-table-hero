import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Palette, Clock, BarChart3, Hash, PoundSterling, Percent, Sigma, Ruler, BookOpen, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { PRESET_THEMES, DEFAULT_THEME, getTheme, saveTheme, resetTheme } from '@/lib/themeStorage';
import { t } from '@/lib/i18n';
import { useInstallPrompt } from '@/lib/pwa-install';

type YearFilter = 'all' | 3 | 4 | 5;

const YEAR_KEY = 'hub-year-filter';

// Each module's primary year coverage. Used by the Year picker to filter
// which cards are shown. Years are inclusive — a module tagged [3,4,5] is
// shown for any selection.
type ModuleCard = {
  slug: string;
  title: string;
  subtitle: string;
  glyph?: string;        // text glyph (preferred when available, monochrome by default)
  iconName?: 'clock' | 'bar-chart-3' | 'hash' | 'pound' | 'percent' | 'sigma' | 'ruler' | 'book-open';
  years: Array<3 | 4 | 5>;
};

const MODULES: ModuleCard[] = [
  { slug: 'times-tables', title: 'Times Tables', subtitle: '×  ÷  x²  √ · Tables 1–12', glyph: '×', years: [3, 4, 5] },
  { slug: 'arithmetic', title: 'Arithmetic', subtitle: '+  −  ×  ÷ · 1–5 digits', glyph: '+', years: [3, 4, 5] },
  { slug: 'time', title: 'Time', subtitle: 'Read analog clocks · Roman · durations', iconName: 'clock', years: [3, 4, 5] },
  { slug: 'fractions', title: 'Fractions', subtitle: '+ − × · same and different denominators', glyph: '¾', years: [3, 4, 5] },
  { slug: 'shapes', title: 'Shapes', subtitle: '2D · 3D · angles · area · coords', glyph: '⬡', years: [3, 4, 5] },
  { slug: 'charts', title: 'Charts', subtitle: 'Bar · pie · line · timetable', iconName: 'bar-chart-3', years: [3, 4, 5] },
  { slug: 'number-sense', title: 'Number Sense', subtitle: 'Place value · rounding · Roman · Y3–Y5', iconName: 'hash', years: [3, 4, 5] },
  { slug: 'money', title: 'Money', subtitle: 'Add · change · totals · compare prices', iconName: 'pound', years: [3, 4, 5] },
  { slug: 'decimals', title: 'Decimals', subtitle: 'Decimals · percentages · rounding · Y4–Y5', iconName: 'percent', years: [4, 5] },
  { slug: 'number-theory', title: 'Number Theory', subtitle: 'Factors · multiples · primes · squares', iconName: 'sigma', years: [5] },
  { slug: 'conversions', title: 'Conversions', subtitle: 'Units · perimeter · area · volume', iconName: 'ruler', years: [4, 5] },
  { slug: 'word-problems', title: 'Word Problems', subtitle: 'One- and two-step problems · Y3–Y5', iconName: 'book-open', years: [3, 4, 5] },
];

function ModuleIcon({ iconName }: { iconName: NonNullable<ModuleCard['iconName']> }) {
  const cls = 'w-14 h-14 md:w-[72px] md:h-[72px] text-primary';
  switch (iconName) {
    case 'clock': return <Clock className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'bar-chart-3': return <BarChart3 className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'hash': return <Hash className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'pound': return <PoundSterling className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'percent': return <Percent className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'sigma': return <Sigma className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'ruler': return <Ruler className={cls} strokeWidth={2.5} aria-hidden="true" />;
    case 'book-open': return <BookOpen className={cls} strokeWidth={2.5} aria-hidden="true" />;
  }
}

function loadYear(): YearFilter {
  try {
    const v = localStorage.getItem(YEAR_KEY);
    if (v === '3' || v === '4' || v === '5') return Number(v) as 3 | 4 | 5;
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
  const yearOrder: YearFilter[] = ['all', 3, 4, 5];
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
              aria-label="Open menu"
              aria-expanded={showMenu}
              className="text-muted-foreground hover:text-foreground transition-colors text-base flex items-center gap-1.5 min-h-[44px] px-2 -ml-2"
            >
              <Menu className="w-5 h-5" aria-hidden="true" /> Menu
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
                    Colors
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
                        Reset to Default
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
                      Install app
                    </button>
                  )}
                </div>
                <div className="border-t mt-1 pt-1.5 px-4 pb-1 text-[10px] text-muted-foreground/60">
                  v0.1.0-{(globalThis as unknown as { __GIT_HASH__?: string }).__GIT_HASH__ || 'dev'}
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
          aria-label="School year"
          className="mb-4 md:mb-6 flex items-center justify-center gap-2"
        >
          {(['all', 3, 4, 5] as YearFilter[]).map(y => {
            const label = y === 'all' ? 'All' : `Y${y}`;
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
              {m.glyph ? (
                <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">
                  {m.glyph}
                </div>
              ) : (
                <div className="flex justify-center mb-2">
                  <ModuleIcon iconName={m.iconName!} />
                </div>
              )}
              <div className="text-lg md:text-xl font-bold text-foreground text-center">{m.title}</div>
              <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
                {m.subtitle}
              </div>
            </Card>
          ))}
        </div>

        {visibleModules.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            No modules tagged for this year yet.
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
