import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Difficulty, GameMode, GameSettings, Operation } from '@/lib/gameLogic';
import { getTotalStats, getSavedSettings, saveSettings } from '@/lib/gameStorage';
import type { UserProfile } from '@/lib/userStorage';
import { UserSelector } from '@/components/UserSelector';
import { PRESET_THEMES, DEFAULT_THEME, getTheme, saveTheme, resetTheme } from '@/lib/themeStorage';

interface GameSetupProps {
  onStart: (settings: GameSettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToPrint?: () => void;
}

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const QUESTION_COUNTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TIME_LIMITS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '7 min', value: 420 },
  { label: '10 min', value: 600 },
  { label: '12 min', value: 720 },
  { label: '15 min', value: 900 },
];

export function GameSetup({ onStart, currentUser, onUserChange, onNewUser, onNavigateToPrint }: GameSetupProps) {
  const [selectedTables, setSelectedTables] = useState<number[]>(TABLES);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('questions');
  const [operation, setOperation] = useState<Operation>('multiply');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  const stats = getTotalStats(currentUser?.id);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutsideDesktop = desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node);
      const clickedOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node);

      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Reset color picker when menu closes
  useEffect(() => {
    if (!showMenu) {
      setShowColorPicker(false);
    }
  }, [showMenu]);

  // Load saved settings on mount or when user changes
  useEffect(() => {
    const saved = getSavedSettings(currentUser?.id);
    setSelectedTables(saved.tables);
    setDifficulty(saved.difficulty as Difficulty);
    setGameMode(saved.gameMode as GameMode);
    setOperation((saved.operation as Operation) || 'multiply');
    setQuestionCount(saved.questionCount);
    setTimeLimit(saved.timeLimit);
    setIsLoaded(true);
  }, [currentUser?.id]);

  const toggleTable = (table: number) => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAll = () => setSelectedTables(TABLES);
  const clearAll = () => setSelectedTables([]);

  const handleStart = () => {
    if (selectedTables.length === 0) return;

    // Save settings for next time
    saveSettings({
      tables: selectedTables,
      difficulty,
      gameMode,
      operation,
      questionCount,
      timeLimit,
    }, currentUser?.id);

    onStart({
      tables: selectedTables.sort((a, b) => a - b),
      difficulty,
      gameMode,
      operation,
      questionCount,
      timeLimit,
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[600px]">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          {/* Desktop: Side-by-side layout */}
          <div className="hidden md:block">
            <div className="relative flex items-center justify-center">
              <div className="absolute left-0" ref={desktopMenuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base flex items-center gap-1"
              >
                ☰ Menu
              </button>
              {showMenu && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                  {/* Colors Option */}
                  <div className="px-2">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-card-border"
                        style={{
                          backgroundColor: currentTheme.customColors?.primary
                            ? `hsl(${currentTheme.customColors.primary})`
                            : `hsl(${currentTheme.hue}, 85%, 58%)`
                        }}
                      />
                      Colors
                    </button>
                    {showColorPicker && (
                      <div className="px-2 py-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_THEMES.map((theme, index) => (
                            <button
                              key={theme.hue || `custom-${index}`}
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
                                className="w-8 h-8 rounded-full border border-card-border"
                                style={{
                                  backgroundColor: theme.customColors?.primary
                                    ? `hsl(${theme.customColors.primary})`
                                    : `hsl(${theme.hue}, 85%, 58%)`
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

                  {/* Print Worksheets Option */}
                  {onNavigateToPrint && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onNavigateToPrint();
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      🖨️ Print Worksheets
                    </button>
                  )}
                </div>
              )}
            </div>
              <h1 className="text-[30px] font-bold text-primary flex items-center gap-2">
                <img src="/favicon.png" alt="Maths Challenge" className="w-8 h-8" />
                Maths Challenge
              </h1>
              <div className="absolute right-0">
                <UserSelector
                  currentUser={currentUser}
                  onUserChange={onUserChange}
                  onNewUser={onNewUser}
                />
              </div>
            </div>
            <p className="mt-1 text-center text-[13px] text-muted-foreground">
              {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick your tables and let's practise!
            </p>
            {stats.totalGames > 0 && (
              <p className="mt-1 text-center text-xs md:text-sm text-muted-foreground">
                {stats.totalGames} games, {stats.totalCorrect} correct!
              </p>
            )}
          </div>

          {/* Mobile: Stacked layout */}
          <div className="md:hidden">
            <h1 className="text-[24px] font-bold text-primary flex items-center justify-center gap-2 mb-3">
              <img src="/favicon.png" alt="Maths Challenge" className="w-6 h-6" />
              Maths Challenge
            </h1>
            <div className="flex items-center justify-between mb-2">
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
                >
                  ☰ Menu
                </button>
                {showMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                    {/* Colors Option */}
                    <div className="px-2">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-card-border"
                          style={{
                            backgroundColor: currentTheme.customColors?.primary
                              ? `hsl(${currentTheme.customColors.primary})`
                              : `hsl(${currentTheme.hue}, 85%, 58%)`
                          }}
                        />
                        Colors
                      </button>
                      {showColorPicker && (
                        <div className="px-2 py-2 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            {PRESET_THEMES.map((theme, index) => (
                              <button
                                key={theme.hue || `custom-${index}`}
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
                                  className="w-8 h-8 rounded-full border border-card-border"
                                  style={{
                                    backgroundColor: theme.customColors?.primary
                                      ? `hsl(${theme.customColors.primary})`
                                      : `hsl(${theme.hue}, 85%, 58%)`
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

                    {/* Print Worksheets Option */}
                    {onNavigateToPrint && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigateToPrint();
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        🖨️ Print Worksheets
                      </button>
                    )}
                  </div>
                )}
              </div>
              <UserSelector
                currentUser={currentUser}
                onUserChange={onUserChange}
                onNewUser={onNewUser}
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick your tables and let's practise!
            </p>
            {stats.totalGames > 0 && (
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {stats.totalGames} games, {stats.totalCorrect} correct!
              </p>
            )}
          </div>
        </div>

        {/* Table Selection */}
        <Card className="mb-4 p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-foreground">Choose Your Tables</h2>
            <div className="flex gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-6 gap-2">
              {TABLES.slice(0, 6).map(table => (
                <button
                  key={table}
                  onClick={() => toggleTable(table)}
                  className={cn(
                    'rounded-[14px] py-2 text-[16px] font-bold transition-all',
                    'hover:scale-105 active:scale-95',
                    selectedTables.includes(table)
                      ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                      : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                  )}
                >
                  {table}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {TABLES.slice(6, 12).map(table => (
                <button
                  key={table}
                  onClick={() => toggleTable(table)}
                  className={cn(
                    'rounded-[14px] py-2 text-[16px] font-bold transition-all',
                    'hover:scale-105 active:scale-95',
                    selectedTables.includes(table)
                      ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                      : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                  )}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Operation */}
        <Card className="mb-4 p-5 shadow-card">
          <h2 className="mb-3 text-[20px] font-semibold text-foreground">Operation</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'multiply', label: '× Multiply' },
              { id: 'divide', label: '÷ Divide' },
              { id: 'both', label: '×÷ Both' },
            ] as const).map(op => (
              <button
                key={op.id}
                onClick={() => setOperation(op.id)}
                className={cn(
                  'rounded-xl h-[42px] flex items-center justify-center text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  operation === op.id
                    ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                    : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                )}
              >
                <span className="text-[16px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Difficulty */}
        <Card className="mb-4 p-5 shadow-card">
          <h2 className="mb-3 text-[20px] font-semibold text-foreground">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'easy', label: 'Easy', desc: 'far apart' },
              { id: 'medium', label: 'Medium', desc: 'closer together' },
              { id: 'hard', label: 'Hard', desc: 'type your answer' },
            ] as const).map(diff => (
              <div key={diff.id} className="flex flex-col gap-1.5">
                <button
                  onClick={() => setDifficulty(diff.id)}
                  className={cn(
                    'rounded-xl h-[42px] flex items-center justify-center text-center font-bold transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    difficulty === diff.id
                      ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                      : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                  )}
                >
                  <span className="text-[16px]">{diff.label}</span>
                </button>
                <p className="text-[11px] text-muted-foreground text-center">{diff.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Game Mode */}
        <Card className="mb-4 p-5 shadow-card">
          <h2 className="mb-3 text-[20px] font-semibold text-foreground">Game Mode</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn(
                'flex-1 rounded-xl h-[42px] flex items-center justify-center text-center font-bold transition-all',
                'hover:scale-[1.02] active:scale-[0.98]',
                gameMode === 'questions'
                  ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                  : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
              )}
            >
              <span className="text-[16px]">Questions</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn(
                'flex-1 rounded-xl h-[42px] flex items-center justify-center text-center font-bold transition-all',
                'hover:scale-[1.02] active:scale-[0.98]',
                gameMode === 'time'
                  ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl hover:shadow-2xl'
                  : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
              )}
            >
              <span className="text-[16px]">Timed</span>
            </button>
          </div>

          {/* Options based on mode */}
          {gameMode === 'questions' ? (
            <div className="grid grid-cols-10 gap-1.5">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    'rounded-[14px] py-2 text-[16px] font-bold transition-all',
                    questionCount === count
                      ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl'
                      : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {TIME_LIMITS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTimeLimit(value)}
                  className={cn(
                    'rounded-[14px] py-2 text-[16px] font-bold transition-all',
                    timeLimit === value
                      ? 'bg-gradient-to-b from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl'
                      : 'bg-gradient-to-b from-secondary via-secondary/90 to-secondary/80 text-muted-foreground hover:from-secondary/85 hover:to-secondary/75 border border-card-border shadow-lg'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          disabled={selectedTables.length === 0}
          className="w-full py-4 text-xl md:text-2xl font-bold bg-gradient-to-b from-primary to-primary/90 shadow-button transition-all hover:translate-y-[-2px] hover:shadow-xl active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:from-muted disabled:to-muted"
          size="lg"
        >
          {selectedTables.length === 0 ? 'Select at least one table' : "Let's Go!"}
        </Button>
      </div>
    </div>
  );
}
