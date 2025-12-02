import { useState, useCallback } from 'react';
import { GameSetup } from '@/components/game/GameSetup';
import { GamePlay, GameResults as GameResultsType } from '@/components/game/GamePlay';
import { GameResults } from '@/components/game/GameResults';
import type { GameSettings } from '@/lib/gameLogic';

type GameState = 'setup' | 'playing' | 'results';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [results, setResults] = useState<GameResultsType | null>(null);

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

  return (
    <>
      {gameState === 'setup' && <GameSetup onStart={handleStart} />}
      {gameState === 'playing' && settings && (
        <GamePlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={handleQuit}
        />
      )}
      {gameState === 'results' && results && (
        <GameResults
          results={results}
          onPlayAgain={handlePlayAgain}
          onNewGame={handleNewGame}
        />
      )}
    </>
  );
};

export default Index;
