import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlgebraSetup } from './AlgebraSetup';
import { AlgebraPlay } from './AlgebraPlay';
import type { AlgebraGameResult } from './AlgebraPlay';
import { AlgebraResults } from './AlgebraResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { AlgebraSettings } from './logic';

type State = 'setup' | 'playing' | 'results';

interface AlgebraIndexProps {
  printOpen?: boolean;
}

const AlgebraIndex = ({ printOpen = false }: AlgebraIndexProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<AlgebraSettings | null>(null);
  const [result, setResult] = useState<AlgebraGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: AlgebraSettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: AlgebraGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <AlgebraSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          autoOpenPrint={printOpen}
        />
      )}
      {state === 'playing' && settings && (
        <AlgebraPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <AlgebraResults
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

export default AlgebraIndex;
