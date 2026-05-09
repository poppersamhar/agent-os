import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeColor = 'ink' | 'stone' | 'charcoal';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: 'ink',
  setThemeColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = 'agent-os-theme-color';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeColor | null;
      if (stored && ['ink', 'stone', 'charcoal'].includes(stored)) {
        return stored;
      }
    } catch { /* ignore */ }
    return 'ink';
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    try {
      localStorage.setItem(STORAGE_KEY, color);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
