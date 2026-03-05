import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Fast sync from localStorage for instant render
    const stored = localStorage.getItem('theme');
    return (stored as 'light' | 'dark') || 'light';
  });
  const { getPreference, setPreference, loading } = useUserPreferences();

  // Load from DB after auth resolves
  useEffect(() => {
    if (loading) return;
    getPreference('theme', 'light').then((val) => {
      const t = val as 'light' | 'dark';
      if (t !== theme) setTheme(t);
    });
  }, [loading]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette) {
      window.dispatchEvent(new CustomEvent('theme-changed'));
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setPreference('theme', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
