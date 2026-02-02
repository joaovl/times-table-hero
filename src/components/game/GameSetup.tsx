import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Difficulty, GameMode, GameSettings, Operation } from '@/lib/gameLogic';
import { getTotalStats, getSavedSettings, saveSettings } from '@/lib/gameStorage';
import type { UserProfile } from '@/lib/userStorage';
import { UserSelector } from '@/components/UserSelector';

interface GameSetupProps {
  onStart: (settings: GameSettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToPrint?: () => void;
}

const TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
  const menuRef = useRef<HTMLDivElement>(null);

  const stats = getTotalStats(currentUser?.id);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="relative flex items-center justify-center">
            <div className="absolute left-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base flex items-center gap-1"
              >
                ☰ Menu
              </button>
              {showMenu && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
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
            <h1 className="text-2xl font-extrabold text-primary md:text-5xl">
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
          <p className="mt-1 text-center text-sm md:text-lg text-muted-foreground">
            {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick your tables and let's practise!
          </p>
          {stats.totalGames > 0 && (
            <p className="mt-1 text-center text-xs md:text-sm text-muted-foreground">
              {stats.totalGames} games, {stats.totalCorrect} correct!
            </p>
          )}
        </div>

        {/* Table Selection */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <div className="mb-2 md:mb-4 flex items-center justify-between">
            <h2 className="text-base md:text-xl font-bold">Choose Your Tables</h2>
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
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {TABLES.map(table => (
              <button
                key={table}
                onClick={() => toggleTable(table)}
                className={cn(
                  'flex h-10 md:h-14 w-full items-center justify-center rounded-lg md:rounded-xl transition-all',
                  'hover:scale-105 active:scale-95',
                  selectedTables.includes(table)
                    ? 'bg-primary text-primary-foreground text-base md:text-xl font-extrabold shadow-button translate-y-[-2px] ring-2 ring-primary ring-offset-1 md:ring-offset-2'
                    : 'bg-muted/50 text-muted-foreground text-sm md:text-lg font-medium hover:bg-muted'
                )}
              >
                {table}
              </button>
            ))}
          </div>
        </Card>

        {/* Operation */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <h2 className="mb-2 md:mb-4 text-base md:text-xl font-bold">Operation</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'multiply', label: '×' },
              { id: 'divide', label: '÷' },
              { id: 'both', label: '×÷' },
            ] as const).map(op => (
              <button
                key={op.id}
                onClick={() => setOperation(op.id)}
                className={cn(
                  'rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  operation === op.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className="text-xl md:text-2xl">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Difficulty */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <h2 className="mb-2 md:mb-4 text-base md:text-xl font-bold">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'easy', label: 'Easy', color: 'bg-success text-success-foreground' },
              { id: 'medium', label: 'Medium', color: 'bg-secondary text-secondary-foreground' },
              { id: 'hard', label: 'Hard', color: 'bg-accent text-accent-foreground' },
            ] as const).map(diff => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={cn(
                  'rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  difficulty === diff.id
                    ? `${diff.color} shadow-sm`
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className="text-sm md:text-base">{diff.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Game Mode */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <h2 className="mb-2 md:mb-4 text-base md:text-xl font-bold">Game Mode</h2>
          <div className="flex gap-2 md:gap-3 mb-2 md:mb-4">
            <button
              onClick={() => setGameMode('questions')}
              className={cn(
                'flex-1 rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                'hover:scale-[1.02] active:scale-[0.98]',
                gameMode === 'questions'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-sm md:text-lg">Questions</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn(
                'flex-1 rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                'hover:scale-[1.02] active:scale-[0.98]',
                gameMode === 'time'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-sm md:text-lg">Timed</span>
            </button>
          </div>

          {/* Options based on mode */}
          {gameMode === 'questions' ? (
            <div className="grid grid-cols-10 gap-1">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    'rounded py-1 md:py-2 text-xs md:text-sm font-bold transition-all',
                    questionCount === count
                      ? 'bg-primary/20 text-primary ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {TIME_LIMITS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTimeLimit(value)}
                  className={cn(
                    'rounded py-1 md:py-2 text-xs md:text-sm font-bold transition-all',
                    timeLimit === value
                      ? 'bg-primary/20 text-primary ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          className="w-full py-4 md:py-8 text-lg md:text-2xl font-bold shadow-button transition-all hover:translate-y-[-2px] active:translate-y-0 active:shadow-none disabled:opacity-50"
          size="lg"
        >
          {selectedTables.length === 0 ? 'Select at least one table' : "Let's Go!"}
        </Button>
      </div>
    </div>
  );
}
