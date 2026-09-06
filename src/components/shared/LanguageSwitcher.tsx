import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import { cn } from '@/utils/formatters';

interface Props {
  /** 'dropdown' (default) for navbar, 'inline' for mobile menu */
  variant?: 'dropdown' | 'inline';
}

export function LanguageSwitcher({ variant = 'dropdown' }: Props) {
  const { lang, language, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (variant === 'inline') {
    return (
      <div className="lang-inline">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            className={cn('lang-inline-btn', lang === l.code && 'active')}
            onClick={() => setLang(l.code)}
            aria-label={`Switch to ${l.labelEn}`}
            aria-pressed={lang === l.code}
          >
            <span className="lang-flag">{l.flag}</span>
            <div className="lang-inline-text">
              <span className="lang-inline-native">{l.label}</span>
              <span className="lang-inline-en">{l.labelEn}</span>
            </div>
            {lang === l.code && <Check size={14} className="lang-check" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className={cn('lang-trigger', open && 'lang-trigger-open')}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Current language: ${language.labelEn}. Click to change.`}
        title={`Change Language (${language.label})`}
        type="button"
      >
        <div className="lang-trigger-left">
          <Globe size={15} className="lang-globe" />
          <span className="lang-flag">{language.flag}</span>
          <span className="lang-code">{language.code.toUpperCase()}</span>
        </div>
        <ChevronDown size={13} className={cn('lang-chevron', open && 'rotated')} />
      </button>

      {open && (
        <div className="lang-dropdown" role="listbox" aria-label="Select language">
          <div className="lang-dropdown-header">
            <div className="lang-dropdown-header-left">
              <Globe size={13} />
              <span>Select Language / Ururimi / Langue</span>
            </div>
          </div>
          <div className="lang-dropdown-list">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                role="option"
                aria-selected={lang === l.code}
                className={cn('lang-option', lang === l.code && 'active')}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                type="button"
              >
                <div className="lang-option-flag-wrap">
                  <span className="lang-flag">{l.flag}</span>
                </div>
                <div className="lang-option-label">
                  <span className="lang-option-native">{l.label}</span>
                  <span className="lang-option-en">{l.labelEn}</span>
                </div>
                {lang === l.code && (
                  <div className="lang-check-wrap">
                    <Check size={14} className="lang-check" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
