import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NumberTheorySetup } from './NumberTheorySetup';
import { NumberTheoryPlay } from './NumberTheoryPlay';
import type { NumberTheoryGameResult } from './NumberTheoryPlay';
import { NumberTheoryResults } from './NumberTheoryResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { NumberTheorySettings } from './logic';

type State = 'setup' | 'playing' | 'results';

interface NumberTheoryIndexProps {
  printOpen?: boolean;
}

const NumberTheoryIndex = ({ printOpen = false }: NumberTheoryIndexProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<NumberTheorySettings | null>(null);
  const [result, setResult] = useState<NumberTheoryGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: NumberTheorySettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: NumberTheoryGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <NumberTheorySetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          autoOpenPrint={printOpen}
        />
      )}
      {state === 'playing' && settings && (
        <NumberTheoryPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <NumberTheoryResults
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

export default NumberTheoryIndex;
