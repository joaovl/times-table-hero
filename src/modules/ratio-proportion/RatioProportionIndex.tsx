import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RatioProportionSetup } from './RatioProportionSetup';
import { RatioProportionPlay } from './RatioProportionPlay';
import type { RatioGameResult } from './RatioProportionPlay';
import { RatioProportionResults } from './RatioProportionResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { RatioSettings } from './logic';

type State = 'setup' | 'playing' | 'results';

interface RatioProportionIndexProps {
  printOpen?: boolean;
}

const RatioProportionIndex = ({ printOpen = false }: RatioProportionIndexProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<RatioSettings | null>(null);
  const [result, setResult] = useState<RatioGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: RatioSettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: RatioGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <RatioProportionSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          autoOpenPrint={printOpen}
        />
      )}
      {state === 'playing' && settings && (
        <RatioProportionPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <RatioProportionResults
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

export default RatioProportionIndex;
