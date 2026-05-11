export interface ThemeColors {
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  nameKey: string;
  colors: ThemeColors;
}

export const defaultDark: ThemeDefinition = {
  id: 'default-dark',
  name: 'Default Dark',
  nameKey: 'themes.defaultDark',
  colors: {
    bgBase: '#0A0A0F',
    bgSurface: '#141419',
    bgElevated: '#1A1A22',
    border: '#1E1E26',
    textPrimary: '#E8E8ED',
    textSecondary: '#8B8B9E',
    textMuted: '#55556A',
    accent: '#6366F1',
    accentHover: '#818CF8',
    success: '#10B981',
    successLight: '#34D399',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    error: '#EF4444',
    errorLight: '#F87171',
  },
};

export const monokai: ThemeDefinition = {
  id: 'monokai',
  name: 'Monokai',
  nameKey: 'themes.monokai',
  colors: {
    bgBase: '#1E1F1C',
    bgSurface: '#272822',
    bgElevated: '#3E3D32',
    border: '#49483E',
    textPrimary: '#F8F8F2',
    textSecondary: '#A6A68A',
    textMuted: '#75715E',
    accent: '#F92672',
    accentHover: '#FF6188',
    success: '#A6E22E',
    successLight: '#C1E849',
    warning: '#E6DB74',
    warningLight: '#F0E68C',
    error: '#F92672',
    errorLight: '#FF6188',
  },
};

export const dracula: ThemeDefinition = {
  id: 'dracula',
  name: 'Dracula',
  nameKey: 'themes.dracula',
  colors: {
    bgBase: '#1E1F29',
    bgSurface: '#282A36',
    bgElevated: '#343746',
    border: '#44475A',
    textPrimary: '#F8F8F2',
    textSecondary: '#BFBFBF',
    textMuted: '#6272A4',
    accent: '#BD93F9',
    accentHover: '#C9A8FC',
    success: '#50FA7B',
    successLight: '#69FF94',
    warning: '#F1FA8C',
    warningLight: '#FFFFA5',
    error: '#FF5555',
    errorLight: '#FF6E6E',
  },
};

export const solarizedDark: ThemeDefinition = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  nameKey: 'themes.solarizedDark',
  colors: {
    bgBase: '#001E27',
    bgSurface: '#002B36',
    bgElevated: '#073642',
    border: '#094553',
    textPrimary: '#EEE8D5',
    textSecondary: '#93A1A1',
    textMuted: '#586E75',
    accent: '#268BD2',
    accentHover: '#4BA3E0',
    success: '#859900',
    successLight: '#98A820',
    warning: '#B58900',
    warningLight: '#C99A00',
    error: '#DC322F',
    errorLight: '#E85050',
  },
};

export const nord: ThemeDefinition = {
  id: 'nord',
  name: 'Nord',
  nameKey: 'themes.nord',
  colors: {
    bgBase: '#1D2029',
    bgSurface: '#2E3440',
    bgElevated: '#3B4252',
    border: '#434C5E',
    textPrimary: '#ECEFF4',
    textSecondary: '#D8DEE9',
    textMuted: '#4C566A',
    accent: '#88C0D0',
    accentHover: '#8FBCBB',
    success: '#A3BE8C',
    successLight: '#B5C99D',
    warning: '#EBCB8B',
    warningLight: '#EFD39E',
    error: '#BF616A',
    errorLight: '#C9757D',
  },
};

export const ALL_THEMES: ThemeDefinition[] = [
  defaultDark,
  monokai,
  dracula,
  solarizedDark,
  nord,
];
