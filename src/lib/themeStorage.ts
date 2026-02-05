// Theme color management with localStorage

export interface CustomColors {
  background: string;
  foreground: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  muted: string;
  mutedForeground: string;
}

export interface ThemeColors {
  hue?: number;
  name: string;
  customColors?: CustomColors;
  shadow?: string;
}

const THEME_KEY = 'maths-challenge-theme';

export const DEFAULT_THEME: ThemeColors = {
  name: 'Pastel Mint',
  customColors: {
    background: '155 40% 97%',
    foreground: '155 38% 22%',
    card: '155 32% 99%',
    cardBorder: '155 32% 90%',
    primary: '155 55% 58%',
    primaryForeground: '155 60% 12%',
    secondary: '155 28% 93%',
    secondaryForeground: '155 38% 28%',
    accent: '155 38% 88%',
    muted: '155 25% 95%',
    mutedForeground: '155 25% 50%',
  },
  shadow: '0 2px 8px rgba(134,239,172,0.12)',
};

export const PRESET_THEMES: ThemeColors[] = [
  { hue: 15, name: 'Coral Reef' },
  { hue: 0, name: 'Cherry Red' },
  { hue: 200, name: 'Ocean Blue' },
  { hue: 280, name: 'Purple Magic' },
  { hue: 160, name: 'Forest Green' },
  { hue: 30, name: 'Sunshine Orange' },
  { hue: 340, name: 'Rose Pink' },
  {
    name: 'Sunshine Yellow',
    customColors: {
      background: '45 70% 96%',
      foreground: '45 80% 20%',
      card: '48 60% 99%',
      cardBorder: '45 50% 85%',
      primary: '45 90% 50%',
      primaryForeground: '45 80% 15%',
      secondary: '45 45% 90%',
      secondaryForeground: '45 70% 25%',
      accent: '45 55% 82%',
      muted: '45 35% 94%',
      mutedForeground: '45 40% 45%',
    },
    shadow: '0 4px 10px rgba(234,179,8,0.18)',
  },
  {
    name: 'Pastel Lavender',
    customColors: {
      background: '260 40% 97%',
      foreground: '260 35% 25%',
      card: '260 30% 99%',
      cardBorder: '260 30% 90%',
      primary: '260 50% 68%',
      primaryForeground: '0 0% 100%',
      secondary: '260 28% 93%',
      secondaryForeground: '260 35% 30%',
      accent: '260 35% 88%',
      muted: '260 22% 95%',
      mutedForeground: '260 22% 52%',
    },
    shadow: '0 2px 8px rgba(167,139,250,0.12)',
  },
  {
    name: 'Pastel Mint',
    customColors: {
      background: '155 40% 97%',
      foreground: '155 38% 22%',
      card: '155 32% 99%',
      cardBorder: '155 32% 90%',
      primary: '155 55% 58%',
      primaryForeground: '155 60% 12%',
      secondary: '155 28% 93%',
      secondaryForeground: '155 38% 28%',
      accent: '155 38% 88%',
      muted: '155 25% 95%',
      mutedForeground: '155 25% 50%',
    },
    shadow: '0 2px 8px rgba(134,239,172,0.12)',
  },
];

export function getTheme(): ThemeColors {
  try {
    const data = localStorage.getItem(THEME_KEY);
    return data ? JSON.parse(data) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: ThemeColors): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  applyTheme(theme);
}

export function resetTheme(): void {
  localStorage.removeItem(THEME_KEY);
  applyTheme(DEFAULT_THEME);
}

export function applyTheme(theme: ThemeColors): void {
  const root = document.documentElement;

  if (theme.customColors) {
    // Apply custom colors
    const colors = theme.customColors;
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--card-border', colors.cardBorder);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', colors.mutedForeground);
    root.style.setProperty('--border', colors.cardBorder);
    root.style.setProperty('--input', colors.cardBorder);
    root.style.setProperty('--ring', colors.primary);

    // Update shadows with custom shadow if provided
    if (theme.shadow) {
      root.style.setProperty('--shadow-soft', theme.shadow);
      root.style.setProperty('--shadow-button', theme.shadow);
      root.style.setProperty('--shadow-card', theme.shadow);
    }
  } else if (theme.hue !== undefined) {
    // Apply hue-based colors
    const hue = theme.hue;
    root.style.setProperty('--background', `${hue} 55% 97%`);
    root.style.setProperty('--foreground', `${hue} 60% 22%`);
    root.style.setProperty('--card', `${hue} 40% 99%`);
    root.style.setProperty('--card-border', `${hue} 45% 88%`);
    root.style.setProperty('--primary', `${hue} 85% 58%`);
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--secondary', `${hue} 40% 92%`);
    root.style.setProperty('--secondary-foreground', `${hue} 60% 22%`);
    root.style.setProperty('--muted', `${hue} 30% 95%`);
    root.style.setProperty('--muted-foreground', `${hue} 20% 50%`);
    root.style.setProperty('--accent', `${hue} 50% 86%`);
    root.style.setProperty('--border', `${hue} 45% 88%`);
    root.style.setProperty('--input', `${hue} 45% 88%`);
    root.style.setProperty('--ring', `${hue} 85% 58%`);

    // Update shadows
    root.style.setProperty('--shadow-soft', `0 2px 8px hsl(${hue} 30% 85%)`);
    root.style.setProperty('--shadow-button', `0 4px 16px hsl(${hue} 60% 70%)`);
    root.style.setProperty('--shadow-card', `0 2px 8px hsl(${hue} 30% 85%)`);
  }

  // Update game colors (use primary color)
  const primary = theme.customColors?.primary || `${theme.hue} 85% 58%`;
  root.style.setProperty('--game-coral', primary);
}
