import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  genreData: { id: string; name: string; color: string };
  setGenreData: React.Dispatch<React.SetStateAction<{ id: string; name: string; color: string }>>;
  updateGenreData: (id: string, name: string, color: string) => void; 
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [genreData, setGenreData] = useState({ id: '', name: '', color: '' });

  const updateGenreData = useCallback((id: string, name: string, color: string) => {
    // Save to localStorage
    localStorage.setItem('genreData', JSON.stringify({ id, name, color }));
  }, []);

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
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      genreData, 
      setGenreData,
      updateGenreData 
    }}>
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
