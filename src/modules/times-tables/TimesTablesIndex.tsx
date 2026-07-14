import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimesTablesSetup } from './TimesTablesSetup';
import { TimesTablesPlay, GameResults as GameResultsType } from './TimesTablesPlay';
import { TimesTablesResults } from './TimesTablesResults';
import { NewUserModal } from '@/components/NewUserModal';
import { FactsProgress } from './FactsProgress';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import type { GameSettings } from './logic';

type GameState = 'setup' | 'playing' | 'results' | 'progress';

interface TimesTablesIndexProps {
  printOpen?: boolean;
}

const TimesTablesIndex = ({ printOpen = false }: TimesTablesIndexProps) => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>('setup');
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [results, setResults] = useState<GameResultsType | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleStart = (newSettings: GameSettings) => {
    setSettings(newSettings);
    setResults(null);
    setGameState('playing');
  };

  const handleComplete = useCallback((gameResults: GameResultsType) => {
    setResults(gameResults);
    setGameState('results');
  }, []);

  const handleQuit = () => {
    setGameState('setup');
  };

  const handlePlayAgain = () => {
    setResults(null);
    setGameState('playing');
  };

  const handleNewGame = () => {
    setSettings(null);
    setResults(null);
    setGameState('setup');
  };

  const handleUserChange = (user: UserProfile | null) => {
    setCurrentUser(user);
  };

  const handleNewUser = () => {
    setShowNewUserModal(true);
  };

  const handleUserCreated = (userId: string) => {
    const user = getUserById(userId);
    if (user) setCurrentUser(user);
    setShowNewUserModal(false);
  };

  return (
    <>
      {gameState === 'setup' && (
        <TimesTablesSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={handleUserChange}
          onNewUser={handleNewUser}
          onNavigateToHub={() => navigate('/')}
          onViewProgress={() => setGameState('progress')}
          autoOpenPrint={printOpen}
        />
      )}
      {gameState === 'progress' && (
        <FactsProgress userId={currentUser?.id} onBack={() => setGameState('setup')} />
      )}
      {gameState === 'playing' && settings && (
        <TimesTablesPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={handleQuit}
          userId={currentUser?.id}
        />
      )}
      {gameState === 'results' && results && (
        <TimesTablesResults
          results={results}
          onPlayAgain={handlePlayAgain}
          onNewGame={handleNewGame}
          userId={currentUser?.id}
        />
      )}
      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </>
  );
};

export default TimesTablesIndex;
