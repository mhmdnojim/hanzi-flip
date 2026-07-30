/** Selectable color themes — each one overrides the semantic tokens from index.css */

export interface ThemeDef {
  id: string;
  name: string;
  /** swatch preview colors (css hsl strings) */
  swatch: string[];
  /** css variable name -> hsl value */
  vars: Record<string, string>;
  /** whether the theme is dark (adds the `dark` class) */
  dark: boolean;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'forest',
    name: 'Forest & Moss',
    dark: true,
    swatch: ['150 30% 7%', '135 30% 45%', '96 38% 48%', '42 55% 55%'],
    vars: {
      '--background': '150 30% 7%',
      '--foreground': '100 20% 96%',
      '--card': '150 26% 11%',
      '--card-foreground': '100 20% 96%',
      '--popover': '150 26% 11%',
      '--popover-foreground': '100 20% 96%',
      '--primary': '135 30% 45%',
      '--primary-foreground': '150 40% 8%',
      '--secondary': '150 20% 17%',
      '--secondary-foreground': '100 20% 96%',
      '--muted': '150 18% 17%',
      '--muted-foreground': '120 12% 62%',
      '--accent': '105 32% 60%',
      '--accent-foreground': '150 40% 8%',
      '--border': '150 16% 22%',
      '--input': '150 18% 17%',
      '--ring': '135 30% 45%',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    dark: true,
    swatch: ['205 60% 8%', '192 55% 45%', '172 45% 48%', '38 70% 58%'],
    vars: {
      '--background': '205 60% 8%',
      '--foreground': '195 30% 96%',
      '--card': '205 50% 12%',
      '--card-foreground': '195 30% 96%',
      '--popover': '205 50% 12%',
      '--popover-foreground': '195 30% 96%',
      '--primary': '192 55% 45%',
      '--primary-foreground': '205 60% 8%',
      '--secondary': '205 35% 18%',
      '--secondary-foreground': '195 30% 96%',
      '--muted': '205 32% 18%',
      '--muted-foreground': '198 18% 65%',
      '--accent': '172 50% 52%',
      '--accent-foreground': '205 60% 8%',
      '--border': '205 28% 24%',
      '--input': '205 32% 18%',
      '--ring': '192 55% 45%',
    },
  },
  {
    id: 'noir',
    name: 'Noir & Gold',
    dark: true,
    swatch: ['30 8% 6%', '43 62% 55%', '190 45% 50%', '350 45% 55%'],
    vars: {
      '--background': '30 8% 6%',
      '--foreground': '42 30% 95%',
      '--card': '30 8% 11%',
      '--card-foreground': '42 30% 95%',
      '--popover': '30 8% 11%',
      '--popover-foreground': '42 30% 95%',
      '--primary': '43 62% 55%',
      '--primary-foreground': '30 20% 8%',
      '--secondary': '30 7% 17%',
      '--secondary-foreground': '42 30% 95%',
      '--muted': '30 6% 17%',
      '--muted-foreground': '40 10% 66%',
      '--accent': '43 45% 62%',
      '--accent-foreground': '30 20% 8%',
      '--border': '38 12% 24%',
      '--input': '30 6% 17%',
      '--ring': '43 62% 55%',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Indigo',
    dark: true,
    swatch: ['240 40% 8%', '250 65% 60%', '190 70% 52%', '325 60% 58%'],
    vars: {
      '--background': '240 40% 8%',
      '--foreground': '225 25% 96%',
      '--card': '240 35% 12%',
      '--card-foreground': '225 25% 96%',
      '--popover': '240 35% 12%',
      '--popover-foreground': '225 25% 96%',
      '--primary': '250 65% 60%',
      '--primary-foreground': '240 40% 8%',
      '--secondary': '240 25% 18%',
      '--secondary-foreground': '225 25% 96%',
      '--muted': '240 22% 18%',
      '--muted-foreground': '230 15% 66%',
      '--accent': '190 70% 52%',
      '--accent-foreground': '240 40% 8%',
      '--border': '240 20% 24%',
      '--input': '240 22% 18%',
      '--ring': '250 65% 60%',
    },
  },
  {
    id: 'plum',
    name: 'Plum Dusk',
    dark: true,
    swatch: ['295 30% 9%', '315 50% 58%', '265 45% 60%', '45 70% 60%'],
    vars: {
      '--background': '295 30% 9%',
      '--foreground': '300 18% 96%',
      '--card': '295 26% 13%',
      '--card-foreground': '300 18% 96%',
      '--popover': '295 26% 13%',
      '--popover-foreground': '300 18% 96%',
      '--primary': '315 50% 58%',
      '--primary-foreground': '295 35% 10%',
      '--secondary': '295 20% 19%',
      '--secondary-foreground': '300 18% 96%',
      '--muted': '295 18% 19%',
      '--muted-foreground': '300 12% 66%',
      '--accent': '265 45% 62%',
      '--accent-foreground': '295 35% 10%',
      '--border': '295 16% 25%',
      '--input': '295 18% 19%',
      '--ring': '315 50% 58%',
    },
  },
  {
    id: 'frost',
    name: 'Arctic Frost',
    dark: false,
    swatch: ['205 45% 97%', '205 65% 42%', '175 50% 38%', '255 50% 58%'],
    vars: {
      '--background': '205 45% 97%',
      '--foreground': '212 40% 15%',
      '--card': '0 0% 100%',
      '--card-foreground': '212 40% 15%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '212 40% 15%',
      '--primary': '205 65% 42%',
      '--primary-foreground': '205 45% 98%',
      '--secondary': '205 35% 92%',
      '--secondary-foreground': '212 40% 18%',
      '--muted': '205 30% 92%',
      '--muted-foreground': '208 16% 42%',
      '--accent': '175 50% 40%',
      '--accent-foreground': '205 45% 98%',
      '--border': '205 25% 85%',
      '--input': '205 30% 92%',
      '--ring': '205 65% 42%',
    },
  },
  {
    id: 'paper',
    name: 'Paper & Ink',
    dark: false,
    swatch: ['210 20% 97%', '215 45% 40%', '190 40% 40%', '15 60% 52%'],
    vars: {
      '--background': '210 20% 97%',
      '--foreground': '215 30% 14%',
      '--card': '0 0% 100%',
      '--card-foreground': '215 30% 14%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '215 30% 14%',
      '--primary': '215 45% 40%',
      '--primary-foreground': '210 25% 98%',
      '--secondary': '210 20% 91%',
      '--secondary-foreground': '215 30% 18%',
      '--muted': '210 18% 91%',
      '--muted-foreground': '215 12% 42%',
      '--accent': '190 40% 42%',
      '--accent-foreground': '210 25% 98%',
      '--border': '210 16% 84%',
      '--input': '210 18% 91%',
      '--ring': '215 45% 40%',
    },
  },
];

export const DEFAULT_THEME_ID = 'paper';
const THEME_KEY = 'flashcard-theme';

export function getTheme(id: string): ThemeDef {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

/** The theme that follows the given one (wraps around) */
export function nextThemeId(id: string): string {
  const index = THEMES.findIndex(t => t.id === id);
  return THEMES[(index + 1 + THEMES.length) % THEMES.length].id;
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.classList.toggle('dark', theme.dark);
}

export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadThemeId(): string {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Text size presets (matching Lingua Match) mapped to the flashcard font size in px */
export type FontSizePreset = 'small' | 'medium' | 'large' | 'x-large';
export const FONT_SIZE_ORDER: FontSizePreset[] = ['small', 'medium', 'large', 'x-large'];
export const FONT_SIZE_PX: Record<FontSizePreset, number> = {
  small: 44,
  medium: 64,
  large: 88,
  'x-large': 112,
};
export function nextFontSize(size: FontSizePreset): FontSizePreset {
  return FONT_SIZE_ORDER[(FONT_SIZE_ORDER.indexOf(size) + 1) % FONT_SIZE_ORDER.length];
}