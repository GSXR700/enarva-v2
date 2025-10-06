// components/field/LanguageSwitcher.tsx
'use client'

import { Button } from '@/components/ui/button';
import { useFieldLanguage } from '@/contexts/FieldLanguageContext';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useFieldLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium">{language === 'fr' ? 'العربية' : 'Français'}</span>
    </Button>
  );
}