import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { ArithOp, ArithSettings, Difficulty, DigitMode } from './logic';
import { getSavedArithPrintSettings, saveArithPrintSettings } from './storage';
import { ArithmeticWorksheet } from './ArithmeticWorksheet';

const QUESTION_COUNTS = [20, 30, 40, 60, 80];
const PAGE_COUNTS = [1, 3, 5, 10, 20];
const DIGIT_BUTTONS = [1, 2, 3, 4, 5];

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

const ArithmeticPrint = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [operation, setOperation] = useState<ArithOp>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [digitMode, setDigitMode] = useState<DigitMode>({ kind: 'exact', digits: 2 });
  const [questionCount, setQuestionCount] = useState(30);
  const [pageCount, setPageCount] = useState(1);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedArithPrintSettings(currentUser?.id);
    setOperation(s.operation);
    setDifficulty(s.difficulty);
    setDigitMode(s.digitMode);
    setQuestionCount(s.questionCount);
    setPageCount(s.pageCount);
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveArithPrintSettings(
      { operation, difficulty, digitMode, questionCount, pageCount },
      currentUser?.id
    );
  }, [isLoaded, operation, difficulty, digitMode, questionCount, pageCount, currentUser?.id]);

  if (showWorksheet) {
    const s: ArithSettings = {
      operation,
      difficulty,
      digitMode,
      gameMode: 'questions',
      questionCount,
      timeLimit: 0,
    };
    return (
      <ArithmeticWorksheet
        settings={s}
        pageCount={pageCount}
        studentName={currentUser?.name}
        onBack={() => setShowWorksheet(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 md:mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/arithmetic')}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base"
          >
            ← Arithmetic
          </button>
          <h1 className="font-extrabold text-primary text-lg md:text-2xl">Print Arithmetic Worksheet</h1>
          <UserSelector
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            onNewUser={() => setShowNewUserModal(true)}
          />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Operation</h2>
          <div className="grid grid-cols-4 gap-1 md:gap-2">
            {([
              { id: 'add', label: '+' },
              { id: 'subtract', label: '−' },
              { id: 'multiply', label: '×' },
              { id: 'all', label: 'All' },
            ] as const).map(op => (
              <button key={op.id} onClick={() => setOperation(op.id)} className={buttonClass(operation === op.id)}>
                <span className="text-[15px] md:text-[18px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Digits</h2>
          <p className="text-xs text-muted-foreground mb-1">Exactly</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2 mb-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`exact-${d}`}
                onClick={() => setDigitMode({ kind: 'exact', digits: d })}
                className={buttonClass(digitMode.kind === 'exact' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Up to</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`upto-${d}`}
                onClick={() => setDigitMode({ kind: 'upTo', digits: d })}
                className={buttonClass(digitMode.kind === 'upTo' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} className={buttonClass(difficulty === d)}>
                <span className="text-[13px] md:text-[16px]">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Number of Questions</h2>
          <div className="grid grid-cols-5 gap-2">
            {QUESTION_COUNTS.map(c => (
              <button key={c} onClick={() => setQuestionCount(c)} className={buttonClass(questionCount === c)}>
                <span className="text-[15px] md:text-[16px]">{c}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Number of Pages</h2>
          <div className="grid grid-cols-5 gap-2">
            {PAGE_COUNTS.map(c => (
              <button key={c} onClick={() => setPageCount(c)} className={buttonClass(pageCount === c)}>
                <span className="text-[15px] md:text-[16px]">{c}</span>
              </button>
            ))}
          </div>
        </Card>

        <Button
          onClick={() => setShowWorksheet(true)}
          className="w-full h-[42px] md:h-[54px] text-[16px] md:text-[22px] font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65"
          size="lg"
        >
          Generate Worksheet
        </Button>
      </div>

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={(id) => {
            const u = getUserById(id);
            if (u) setCurrentUser(u);
            setShowNewUserModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ArithmeticPrint;
