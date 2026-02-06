import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { Worksheet } from '@/components/Worksheet';

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
            <h1 className="text-[26px] font-extrabold text-primary md:text-[50px]">
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
          <p className="mt-1 text-center text-[16px] md:text-[20px] text-muted-foreground">
            Create printable practice sheets
          </p>
        </div>

        {/* Table Selection */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <div className="mb-2 md:mb-4 flex items-center justify-between">
            <h2 className="text-[18px] md:text-[22px] font-bold">Choose Tables</h2>
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
          <h2 className="mb-2 md:mb-4 text-[18px] md:text-[22px] font-bold">Operation</h2>
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
                  'rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  operation === op.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className="text-xl md:text-2xl">{op.symbol}</span>
                <div className="text-xs md:text-sm mt-1">{op.label}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Question Count */}
        <Card className="mb-3 md:mb-6 p-3 md:p-6 shadow-card">
          <h2 className="mb-2 md:mb-4 text-[18px] md:text-[22px] font-bold">Number of Questions</h2>
          <div className="grid grid-cols-5 gap-2">
            {QUESTION_COUNTS.map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={cn(
                  'rounded-lg py-2 md:py-3 text-center font-bold transition-all',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  questionCount === count
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          className="w-full py-4 md:py-8 text-lg md:text-2xl font-bold shadow-button transition-all hover:translate-y-[-2px] active:translate-y-0 active:shadow-none disabled:opacity-50"
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
