import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);

      // Tạo unique key cho từng loại user
      let themeKey = '';

      if (user.role === 'ADMIN') {
        // Key riêng cho admin
        themeKey = `theme_admin_${user.id}`;
      } else if (
        user.currentProfile === 'ARTIST' &&
        user.artistProfile?.role === 'ARTIST'
      ) {
        // Key riêng cho từng artist profile
        themeKey = `theme_artist_${user.artistProfile.id}`;
      }

      if (themeKey) {
        const savedTheme = localStorage.getItem(themeKey);
        if (savedTheme) {
          setTheme(savedTheme as Theme);
        } else {
          // Mặc định light theme cho ADMIN và ARTIST
          setTheme('light');
          localStorage.setItem(themeKey, 'light');
        }
      }
    }
  }, []);

  const toggleTheme = () => {
    const userData = localStorage.getItem('userData');
    if (!userData) return;

    const user = JSON.parse(userData);
    let themeKey = '';

    // Xác định key dựa trên loại user
    if (user.role === 'ADMIN') {
      themeKey = `theme_admin_${user.id}`;
    } else if (
      user.currentProfile === 'ARTIST' &&
      user.artistProfile?.role === 'ARTIST'
    ) {
      themeKey = `theme_artist_${user.artistProfile.id}`;
    }

    // Chỉ toggle nếu là ADMIN hoặc ARTIST
    if (themeKey) {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem(themeKey, newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
