import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Difficulty, GameMode, GameSettings } from '@/lib/gameLogic';
import { TABLE_COLORS } from '@/lib/gameLogic';
import { getTotalStats, getSavedSettings, saveSettings } from '@/lib/gameStorage';

interface GameSetupProps {
  onStart: (settings: GameSettings) => void;
}

const TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const QUESTION_COUNTS = [5, 10, 15, 20];
const TIME_LIMITS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

export function GameSetup({ onStart }: GameSetupProps) {
  const [selectedTables, setSelectedTables] = useState<number[]>(TABLES);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);

  const stats = getTotalStats();

  // Load saved settings on mount
  useEffect(() => {
    const saved = getSavedSettings();
    setSelectedTables(saved.tables);
    setDifficulty(saved.difficulty as Difficulty);
    setGameMode(saved.gameMode as GameMode);
    setQuestionCount(saved.questionCount);
    setTimeLimit(saved.timeLimit);
    setIsLoaded(true);
  }, []);

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
      questionCount,
      timeLimit,
    });

    onStart({
      tables: selectedTables.sort((a, b) => a - b),
      difficulty,
      gameMode,
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-extrabold text-primary md:text-5xl">
            Times Tables Challenge
          </h1>
          <p className="text-lg text-muted-foreground">
            Pick your tables and let's practise!
          </p>
          {stats.totalGames > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              You've played {stats.totalGames} games and answered {stats.totalCorrect} questions correctly!
            </p>
          )}
        </div>

        {/* Table Selection */}
        <Card className="mb-6 p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Choose Your Tables</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="text-sm"
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="text-sm"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-7">
            {TABLES.map(table => (
              <button
                key={table}
                onClick={() => toggleTable(table)}
                className={cn(
                  'flex h-14 w-full items-center justify-center rounded-xl text-xl font-bold transition-all',
                  'hover:scale-105 active:scale-95',
                  selectedTables.includes(table)
                    ? 'bg-primary text-primary-foreground shadow-button translate-y-[-2px]'
                    : `${TABLE_COLORS[table]} text-foreground border-2 border-transparent hover:border-primary/30`
                )}
              >
                {table}×
              </button>
            ))}
          </div>
        </Card>

        {/* Difficulty */}
        <Card className="mb-6 p-6 shadow-card">
          <h2 className="mb-4 text-xl font-bold">Difficulty</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={cn(
                  'rounded-xl py-4 text-center font-bold transition-all',
                  'hover:scale-105 active:scale-95',
                  difficulty === diff
                    ? diff === 'easy'
                      ? 'bg-success text-success-foreground shadow-md'
                      : diff === 'medium'
                      ? 'bg-secondary text-secondary-foreground shadow-md'
                      : 'bg-accent text-accent-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className="text-lg capitalize">{diff}</span>
                <span className="block text-xs font-normal opacity-80">
                  {diff === 'easy' && '3 choices (spread)'}
                  {diff === 'medium' && '3 choices (close)'}
                  {diff === 'hard' && 'Type answer'}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Game Mode */}
        <Card className="mb-6 p-6 shadow-card">
          <h2 className="mb-4 text-xl font-bold">Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn(
                'rounded-xl py-4 text-center font-bold transition-all',
                'hover:scale-105 active:scale-95',
                gameMode === 'questions'
                  ? 'bg-primary text-primary-foreground shadow-button translate-y-[-2px]'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-lg">Questions</span>
              <span className="block text-xs font-normal opacity-80">
                Set number of questions
              </span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn(
                'rounded-xl py-4 text-center font-bold transition-all',
                'hover:scale-105 active:scale-95',
                gameMode === 'time'
                  ? 'bg-primary text-primary-foreground shadow-button translate-y-[-2px]'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-lg">Timed</span>
              <span className="block text-xs font-normal opacity-80">
                Race against the clock
              </span>
            </button>
          </div>

          {/* Options based on mode */}
          <div className="mt-4">
            {gameMode === 'questions' ? (
              <div className="flex flex-wrap gap-2">
                {QUESTION_COUNTS.map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={cn(
                      'rounded-lg px-6 py-2 font-bold transition-all',
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
              <div className="flex flex-wrap gap-2">
                {TIME_LIMITS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setTimeLimit(value)}
                    className={cn(
                      'rounded-lg px-6 py-2 font-bold transition-all',
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
          </div>
        </Card>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          disabled={selectedTables.length === 0}
          className="w-full py-8 text-2xl font-bold shadow-button transition-all hover:translate-y-[-2px] active:translate-y-0 active:shadow-none disabled:opacity-50"
          size="lg"
        >
          {selectedTables.length === 0 ? 'Select at least one table' : "Let's Go!"}
        </Button>
      </div>
    </div>
  );
}
