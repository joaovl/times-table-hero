import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  UserColor,
  UserIcon,
  USER_COLORS,
  USER_ICONS,
  createUser,
  setCurrentUser,
  getColorClassName,
  getIconEmoji,
} from '@/lib/userStorage';

interface NewUserModalProps {
  onClose: () => void;
  onUserCreated: (userId: string) => void;
}

export function NewUserModal({ onClose, onUserCreated }: NewUserModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<UserColor>('blue');
  const [icon, setIcon] = useState<UserIcon>('star');

  const handleSubmit = () => {
    if (!name.trim()) return;

    const user = createUser(name.trim(), color, icon);
    setCurrentUser(user.id);
    onUserCreated(user.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-center">New Player</h2>

        {/* Name Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border bg-background px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
            maxLength={20}
          />
        </div>

        {/* Color Selection */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Pick a Color</label>
          <div className="flex justify-center gap-3">
            {USER_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cn(
                  'h-12 w-12 rounded-full transition-all hover:scale-110',
                  c.className,
                  color === c.id && 'ring-4 ring-offset-2 ring-primary scale-110'
                )}
              />
            ))}
          </div>
        </div>

        {/* Icon Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Pick an Icon</label>
          <div className="flex justify-center gap-3">
            {USER_ICONS.map(i => (
              <button
                key={i.id}
                onClick={() => setIcon(i.id)}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl transition-all hover:scale-110',
                  icon === i.id && 'ring-4 ring-offset-2 ring-primary scale-110'
                )}
              >
                {i.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-xl',
              getColorClassName(color)
            )}
          >
            {getIconEmoji(icon)}
          </div>
          <span className="text-lg font-medium">{name || 'Your Name'}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1"
          >
            Start Playing
          </Button>
        </div>
      </Card>
    </div>
  );
}
