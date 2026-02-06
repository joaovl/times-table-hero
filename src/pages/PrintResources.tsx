import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { Worksheet } from '@/components/Worksheet';
import { getSetupClasses } from '@/lib/typography';

type Operation = 'multiply' | 'divide' | 'both';

const TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const QUESTION_COUNTS = [20, 40, 60, 80, 100];

const PrintResources = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedTables, setSelectedTables] = useState<number[]>([2, 3, 4, 5]);
  const [operation, setOperation] = useState<Operation>('multiply');
  const [questionCount, setQuestionCount] = useState(40);
  const [showWorksheet, setShowWorksheet] = useState(false);

  // Use shared typography from GameSetup
  const setupTypography = getSetupClasses();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
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

  const handleUserChange = (user: UserProfile | null) => {
    setCurrentUser(user);
  };

  const handleNewUser = () => {
    setShowNewUserModal(true);
  };

  const handleUserCreated = (userId: string) => {
    const user = getUserById(userId);
    if (user) {
      setCurrentUser(user);
    }
    setShowNewUserModal(false);
  };

  const handleGenerate = () => {
    if (selectedTables.length === 0) return;
    setShowWorksheet(true);
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  if (showWorksheet) {
    return (
      <Worksheet
        tables={selectedTables}
        operation={operation}
        questionCount={questionCount}
        studentName={currentUser?.name}
        onBack={() => setShowWorksheet(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="relative flex items-center justify-center">
            <button
              onClick={handleBackToMenu}
              className="absolute left-0 text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base"
            >
              ← Menu
            </button>
            <h1 className={cn("font-extrabold text-primary", setupTypography.title)}>
              Print Worksheets
            </h1>
            <div className="absolute right-0">
              <UserSelector
                currentUser={currentUser}
                onUserChange={handleUserChange}
                onNewUser={handleNewUser}
              />
            </div>
          </div>
          <p className={cn("mt-1 text-center text-muted-foreground", setupTypography.subtitle)}>
            Create printable practice sheets
          </p>
        </div>

        {/* Table Selection */}
        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <div className="mb-2 md:mb-3 flex items-center justify-between">
            <h2 className={cn("font-semibold text-foreground", setupTypography.cardHeading)}>Choose Tables</h2>
            <div className="flex gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className={cn("h-7 md:h-9 px-2 md:px-3", setupTypography.button)}
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className={cn("h-7 md:h-9 px-2 md:px-3", setupTypography.button)}
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
                  'flex h-10 md:h-14 w-full items-center justify-center rounded-lg md:rounded-xl transition-all font-extrabold',
                  'hover:scale-105 active:scale-95',
                  setupTypography.tableNumber,
                  selectedTables.includes(table)
                    ? 'gradient-primary translate-y-[-2px] ring-2 ring-primary ring-offset-1 md:ring-offset-2'
                    : 'gradient-secondary'
                )}
              >
                {table}
              </button>
            ))}
          </div>
        </Card>

        {/* Operation */}
        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className={cn("mb-2 md:mb-3 font-semibold text-foreground", setupTypography.cardHeading)}>Operation</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'multiply', label: 'Multiply', symbol: '×' },
              { id: 'divide', label: 'Divide', symbol: '÷' },
              { id: 'both', label: 'Both', symbol: '×÷' },
            ] as const).map(op => (
              <button
                key={op.id}
                onClick={() => setOperation(op.id)}
                className={cn(
                  'rounded-lg md:rounded-xl h-[32px] md:h-[42px] flex flex-col items-center justify-center text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  operation === op.id
                    ? 'gradient-primary'
                    : 'gradient-secondary'
                )}
              >
                <span className="text-[13px] md:text-[16px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Question Count */}
        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className={cn("mb-2 md:mb-3 font-semibold text-foreground", setupTypography.cardHeading)}>Number of Questions</h2>
          <div className="grid grid-cols-5 gap-2">
            {QUESTION_COUNTS.map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={cn(
                  'rounded-[10px] md:rounded-[14px] py-1 md:py-2 text-[13px] md:text-[16px] font-bold transition-all',
                  questionCount === count
                    ? 'gradient-primary'
                    : 'gradient-secondary'
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </Card>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={selectedTables.length === 0}
          className="w-full h-[42px] md:h-[54px] text-[16px] md:text-[22px] font-bold shadow-button transition-all hover:translate-y-[-2px] active:translate-y-0 active:shadow-none disabled:opacity-50 gradient-primary"
          size="lg"
        >
          {selectedTables.length === 0 ? 'Select at least one table' : 'Generate Worksheet'}
        </Button>
      </div>

      {/* New user modal */}
      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
};

export default PrintResources;
