'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  accentTheme: 'blue',
  reduceMotion: false,
  setTheme: () => {},
  setAccentTheme: () => {},
  setReduceMotion: () => {},
  toggleTheme: () => {}
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');
  const [accentTheme, setAccentThemeState] = useState('blue');
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage and system preferences
  useEffect(() => {
    setMounted(true);
    
    // Check localStorage first
    const storedTheme = localStorage.getItem('upcourse_theme');
    const storedAccent = localStorage.getItem('upcourse_accent');
    const storedMotion = localStorage.getItem('upcourse_reduce_motion');
    
    // Check system preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Set theme
    if (storedTheme) {
      setThemeState(storedTheme);
    } else if (prefersDark) {
      setThemeState('dark');
    }
    
    // Set accent
    if (storedAccent) {
      setAccentThemeState(storedAccent);
    }
    
    // Set motion preference
    if (storedMotion !== null) {
      setReduceMotionState(storedMotion === 'true');
    } else if (prefersReducedMotion) {
      setReduceMotionState(true);
    }
  }, []);

  // Apply theme classes to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark', 'theme-blue', 'theme-teal', 'theme-purple', 'reduce-motion');
    
    // Add dark mode if needed
    if (theme === 'dark') {
      root.classList.add('dark');
    }
    
    // Add accent theme
    if (accentTheme !== 'blue') {
      root.classList.add(`theme-${accentTheme}`);
    }
    
    // Add reduce motion class
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    }
    
    // Store preferences
    localStorage.setItem('upcourse_theme', theme);
    localStorage.setItem('upcourse_accent', accentTheme);
    localStorage.setItem('upcourse_reduce_motion', reduceMotion.toString());
  }, [theme, accentTheme, reduceMotion, mounted]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const setAccentTheme = (newAccent) => {
    setAccentThemeState(newAccent);
  };

  const setReduceMotion = (reduce) => {
    setReduceMotionState(reduce);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Render children immediately but with opacity transition
  // This prevents the flash of incorrect theme while avoiding black screen
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentTheme,
        reduceMotion,
        setTheme,
        setAccentTheme,
        setReduceMotion,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
