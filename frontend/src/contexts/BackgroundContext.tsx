'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BackgroundContextType {
  backgroundStyle: string;
  setBackgroundStyle: (style: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined
);

const defaultBackground = '#111111'; // Default dark background

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundStyle, setBackgroundStyle] =
    useState<string>(defaultBackground);

  return (
    <BackgroundContext.Provider value={{ backgroundStyle, setBackgroundStyle }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
} 