'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full border border-border bg-surface text-on-background hover:bg-on-background/5 transition-colors duration-150 cursor-pointer select-none"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-on-background" />
      ) : (
        <Sun className="w-4 h-4 text-on-background" />
      )}
    </button>
  );
}
