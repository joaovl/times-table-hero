import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  UserProfile,
  getUsers,
  setCurrentUser,
  getColorClassName,
  getIconEmoji,
} from '@/lib/userStorage';

interface UserSelectorProps {
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  onNewUser: () => void;
}

export function UserSelector({ currentUser, onUserChange, onNewUser }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const users = getUsers();

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user.id);
    onUserChange(user);
    setIsOpen(false);
  };

  const handleNewUser = () => {
    setIsOpen(false);
    onNewUser();
  };

  if (!currentUser) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => users.length > 0 ? setIsOpen(true) : onNewUser()}
        className="text-xs md:text-sm"
      >
        Choose Player
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors"
      >
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm',
            getColorClassName(currentUser.color)
          )}
        >
          {getIconEmoji(currentUser.icon)}
        </div>
        <span className="text-sm font-medium hidden md:inline">{currentUser.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background p-2 shadow-lg">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted transition-colors',
                  user.id === currentUser.id && 'bg-muted'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    getColorClassName(user.color)
                  )}
                >
                  {getIconEmoji(user.icon)}
                </div>
                <span className="text-sm">{user.name}</span>
              </button>
            ))}
            <hr className="my-2 border-muted" />
            <button
              onClick={handleNewUser}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              + New Player
            </button>
          </div>
        </>
      )}
    </div>
  );
}
