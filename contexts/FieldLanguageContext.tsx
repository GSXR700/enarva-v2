// contexts/FieldLanguageContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fieldTranslations, LanguageCode } from '@/lib/i18n/fieldTranslations';

type FieldLanguageContextType = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: typeof fieldTranslations['fr']; // Changed from fieldTranslations.fr
  isRTL: boolean;
};

const FieldLanguageContext = createContext<FieldLanguageContextType | undefined>(undefined);

export function FieldLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  // Load saved language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fieldLanguage') as LanguageCode;
    if (saved && (saved === 'fr' || saved === 'ar')) {
      setLanguageState(saved);
    }
  }, []);

  // Update localStorage and document direction when language changes
  useEffect(() => {
    localStorage.setItem('fieldLanguage', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const value: FieldLanguageContextType = {
    language,
    setLanguage,
    t: fieldTranslations[language] as typeof fieldTranslations['fr'], // Type assertion added
    isRTL: language === 'ar'
  };

  return (
    <FieldLanguageContext.Provider value={value}>
      {children}
    </FieldLanguageContext.Provider>
  );
}

export function useFieldLanguage() {
  const context = useContext(FieldLanguageContext);
  if (context === undefined) {
    throw new Error('useFieldLanguage must be used within a FieldLanguageProvider');
  }
  return context;
}