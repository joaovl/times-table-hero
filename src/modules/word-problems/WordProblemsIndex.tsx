import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordProblemsSetup } from './WordProblemsSetup';
import { WordProblemsPlay } from './WordProblemsPlay';
import type { WordGameResult } from './WordProblemsPlay';
import { WordProblemsResults } from './WordProblemsResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { WordSettings } from './logic';

type State = 'setup' | 'playing' | 'results';

interface WordProblemsIndexProps {
  printOpen?: boolean;
}

const WordProblemsIndex = ({ printOpen = false }: WordProblemsIndexProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<WordSettings | null>(null);
  const [result, setResult] = useState<WordGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: WordSettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: WordGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <WordProblemsSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          autoOpenPrint={printOpen}
        />
      )}
      {state === 'playing' && settings && (
        <WordProblemsPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <WordProblemsResults
          result={result}
          onPlayAgain={() => {
            setResult(null);
            setState('playing');
          }}
          onNewGame={() => {
            setResult(null);
            setSettings(null);
            setState('setup');
          }}
          userId={currentUser?.id}
        />
      )}
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
    </>
  );
};

export default WordProblemsIndex;
