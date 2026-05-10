import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Palette, Clock, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { PRESET_THEMES, DEFAULT_THEME, getTheme, saveTheme, resetTheme } from '@/lib/themeStorage';

const Hub = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const menuRef = useRef<HTMLDivElement>(null);

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
          <img src="/favicon.png" alt="Maths Challenge" className="w-6 h-6 md:w-10 md:h-10" />
          Maths Challenge
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-4 md:mb-6">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick what to practise today
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card
            onClick={() => navigate('/times-tables')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">×</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Times Tables</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              ×  ÷  x²  √ &middot; Tables 1–12
            </div>
          </Card>

          <Card
            onClick={() => navigate('/arithmetic')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">+</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Arithmetic</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              +  −  ×  ÷ &middot; 1–5 digits
            </div>
          </Card>

          <Card
            onClick={() => navigate('/time')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="flex justify-center mb-2">
              <Clock className="w-14 h-14 md:w-[72px] md:h-[72px] text-primary" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Time</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              Read analog clocks &middot; hour, half, quarter, 5-min
            </div>
          </Card>

          <Card
            onClick={() => navigate('/fractions')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">¾</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Fractions</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              + − &middot; same and different denominators
            </div>
          </Card>

          <Card
            onClick={() => navigate('/shapes')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">⬡</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Shapes</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              Name shapes &middot; sides &middot; perimeter &middot; area
            </div>
          </Card>

          <Card
            onClick={() => navigate('/charts')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="flex justify-center mb-2">
              <BarChart3 className="w-14 h-14 md:w-[72px] md:h-[72px] text-primary" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Charts</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              Read bar charts &middot; compare &middot; total
            </div>
          </Card>
        </div>
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
