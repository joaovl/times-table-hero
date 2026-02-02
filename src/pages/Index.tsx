import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSetup } from '@/components/game/GameSetup';
import { GamePlay, GameResults as GameResultsType } from '@/components/game/GamePlay';
import { GameResults } from '@/components/game/GameResults';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import type { GameSettings } from '@/lib/gameLogic';

type GameState = 'setup' | 'playing' | 'results';

const Index = () => {
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
    if (user) {
      setCurrentUser(user);
    }
    setShowNewUserModal(false);
  };

  const handleNavigateToPrint = () => {
    navigate('/print');
  };

  return (
    <>
      {gameState === 'setup' && (
        <GameSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={handleUserChange}
          onNewUser={handleNewUser}
          onNavigateToPrint={handleNavigateToPrint}
        />
      )}
      {gameState === 'playing' && settings && (
        <GamePlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={handleQuit}
          userId={currentUser?.id}
        />
      )}
      {gameState === 'results' && results && (
        <GameResults
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

export default Index;
