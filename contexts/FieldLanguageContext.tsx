// contexts/FieldLanguageContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fieldTranslations, LanguageCode } from '@/lib/i18n/fieldTranslations';

type FieldLanguageContextType = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: typeof fieldTranslations['fr'];
  isRTL: boolean;
};

const FieldLanguageContext = createContext<FieldLanguageContextType | undefined>(undefined);

export function FieldLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fieldLanguage') as LanguageCode;
      if (saved && (saved === 'fr' || saved === 'ar')) {
        setLanguageState(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fieldLanguage', language);
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const value: FieldLanguageContextType = {
    language,
    setLanguage,
    t: fieldTranslations[language] as typeof fieldTranslations['fr'],
    isRTL: language === 'ar'
  };

  return (
    <FieldLanguageContext.Provider value={value}>
      {children}
    </FieldLanguageContext.Provider>
  );
}

// Modified hook with fallback
export function useFieldLanguage() {
  const context = useContext(FieldLanguageContext);
  
  // If context is undefined, return default French translations (for non-field pages)
  if (context === undefined) {
    return {
      language: 'fr' as LanguageCode,
      setLanguage: () => {},
      t: fieldTranslations.fr,
      isRTL: false
    };
  }
  
  return context;
}