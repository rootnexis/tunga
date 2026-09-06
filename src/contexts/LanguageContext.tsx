import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { LangCode, Translations } from '@/i18n/types';
import { en } from '@/i18n/en';
import { fr } from '@/i18n/fr';
import { rw } from '@/i18n/rw';
import { sw } from '@/i18n/sw';

// ── Available languages ────────────────────────────────────────────────────
export interface Language {
  code: LangCode;
  label: string;       // Native name
  labelEn: string;     // English name
  flag: string;        // Emoji flag
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',     labelEn: 'English',     flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', label: 'Français',    labelEn: 'French',      flag: '🇫🇷', dir: 'ltr' },
  { code: 'rw', label: 'Kinyarwanda', labelEn: 'Kinyarwanda', flag: '🇷🇼', dir: 'ltr' },
  { code: 'sw', label: 'Kiswahili',   labelEn: 'Kiswahili',   flag: '🇹🇿', dir: 'ltr' },
];

const TRANSLATION_MAP: Record<LangCode, Translations> = { en, fr, rw, sw };
const STORAGE_KEY = 'storefront_lang';

// ── Context ────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  lang: LangCode;
  t: Translations;
  language: Language;
  setLang: (code: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && TRANSLATION_MAP[stored]) return stored;
    // Auto-detect from browser
    const browserLang = navigator.language.split('-')[0] as LangCode;
    return TRANSLATION_MAP[browserLang] ? browserLang : 'en';
  });

  const setLang = useCallback((code: LangCode) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  // Update <html lang> attribute and text direction
  useEffect(() => {
    const lang_obj = LANGUAGES.find(l => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang_obj?.dir ?? 'ltr';
  }, [lang]);

  const t = TRANSLATION_MAP[lang];
  const language = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, t, language, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Shorthand — returns translations directly: const { t } = useT() */
export function useT() {
  return useLanguage();
}
