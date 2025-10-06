// lib/i18n/formatters.ts
import { LanguageCode } from './fieldTranslations';

export function formatDateForLanguage(date: string | Date, language: LanguageCode): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (language === 'ar') {
    return dateObj.toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return dateObj.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTimeForLanguage(date: string | Date, language: LanguageCode): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (language === 'ar') {
    return dateObj.toLocaleTimeString('ar-MA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumberForLanguage(num: number, language: LanguageCode): string {
  if (language === 'ar') {
    return num.toLocaleString('ar-MA');
  }
  
  return num.toLocaleString('fr-FR');
}