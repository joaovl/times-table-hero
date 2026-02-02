// User profile management with localStorage

export type UserColor = 'red' | 'blue' | 'green' | 'purple';
export type UserIcon = 'star' | 'heart' | 'rocket' | 'flower';

export interface UserProfile {
  id: string;
  name: string;
  color: UserColor;
  icon: UserIcon;
  createdAt: string;
}

const USERS_KEY = 'maths-challenge-users';
const CURRENT_USER_KEY = 'maths-challenge-current-user';

export const USER_COLORS: { id: UserColor; className: string }[] = [
  { id: 'red', className: 'bg-red-500' },
  { id: 'blue', className: 'bg-blue-500' },
  { id: 'green', className: 'bg-green-500' },
  { id: 'purple', className: 'bg-purple-500' },
];

export const USER_ICONS: { id: UserIcon; emoji: string }[] = [
  { id: 'star', emoji: '\u2B50' },
  { id: 'heart', emoji: '\u2764\uFE0F' },
  { id: 'rocket', emoji: '\uD83D\uDE80' },
  { id: 'flower', emoji: '\uD83C\uDF38' },
];

export function getUsers(): UserProfile[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: UserProfile[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function createUser(name: string, color: UserColor, icon: UserIcon): UserProfile {
  const user: UserProfile = {
    id: Date.now().toString(),
    name,
    color,
    icon,
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(user);
  saveUsers(users);

  return user;
}

export function getUserById(id: string): UserProfile | undefined {
  return getUsers().find(u => u.id === id);
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);

  // Clear current user if it was the deleted one
  if (getCurrentUserId() === id) {
    clearCurrentUser();
  }
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function setCurrentUser(id: string): void {
  localStorage.setItem(CURRENT_USER_KEY, id);
}

export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): UserProfile | null {
  const id = getCurrentUserId();
  if (!id) return null;
  return getUserById(id) || null;
}

export function getColorClassName(color: UserColor): string {
  return USER_COLORS.find(c => c.id === color)?.className || 'bg-gray-500';
}

export function getIconEmoji(icon: UserIcon): string {
  return USER_ICONS.find(i => i.id === icon)?.emoji || '';
}
