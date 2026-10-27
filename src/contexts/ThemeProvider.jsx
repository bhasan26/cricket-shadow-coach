import { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContext';

function readSavedTheme() {
  try {
    const value = localStorage.getItem('theme');
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const stored = readSavedTheme();
    if (stored) return stored;

    // Otherwise, detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    // Save to localStorage
    try { localStorage.setItem('theme', theme); } catch { /* theme still works without browser storage */ }

    // Update document class and meta tag
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b0f19');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    }
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const stored = readSavedTheme();
      // Only auto-switch if user hasn't manually set a preference
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
