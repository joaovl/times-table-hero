import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatisticsSetup } from './StatisticsSetup';
import { StatisticsPlay } from './StatisticsPlay';
import type { StatsGameResult } from './StatisticsPlay';
import { StatisticsResults } from './StatisticsResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { StatsSettings } from './logic';

type State = 'setup' | 'playing' | 'results';

interface StatisticsIndexProps {
  printOpen?: boolean;
}

const StatisticsIndex = ({ printOpen = false }: StatisticsIndexProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<StatsSettings | null>(null);
  const [result, setResult] = useState<StatsGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: StatsSettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: StatsGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <StatisticsSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          autoOpenPrint={printOpen}
        />
      )}
      {state === 'playing' && settings && (
        <StatisticsPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <StatisticsResults
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

export default StatisticsIndex;
