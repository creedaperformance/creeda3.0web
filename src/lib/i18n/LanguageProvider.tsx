'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type Language = 'en' | 'hi'
type TranslationRecord = Record<string, unknown>

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
  isHindi: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Flat key lookup with dot notation: t('nav.home') => translations.nav.home
function getNestedValue(obj: TranslationRecord, path: string): string | undefined {
  const result = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as TranslationRecord)[part]
    return undefined
  }, obj)
  return typeof result === 'string' ? result : undefined
}

// Lazy-load translations
const translationCache: Record<Language, TranslationRecord | null> = {
  en: null,
  hi: null,
}

async function loadTranslations(lang: Language): Promise<TranslationRecord> {
  if (translationCache[lang]) return translationCache[lang]!
  
  try {
    const loadedModule = await import(`./translations/${lang}.json`)
    translationCache[lang] = loadedModule.default || loadedModule
    return translationCache[lang]!
  } catch (e) {
    console.warn(`[i18n] Failed to load ${lang} translations:`, e)
    return {}
  }
}

function readSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem('creeda-lang')
  return saved === 'hi' ? 'hi' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readSavedLanguage())
  const [translations, setTranslations] = useState<TranslationRecord>({})

  // Load translations when language changes
  useEffect(() => {
    loadTranslations(language).then(setTranslations)
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('creeda-lang', lang)
  }, [])

  const t = useCallback((key: string, fallback?: string): string => {
    const value = getNestedValue(translations, key)
    if (value !== undefined) return value
    // Fallback: use the last segment of the key as human-readable
    return fallback || key.split('.').pop()?.replace(/_/g, ' ') || key
  }, [translations])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isHindi: language === 'hi' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslation()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full 
        bg-white/5 border border-white/10 
        text-xs font-bold tracking-wider
        hover:bg-white/10 transition-all duration-200
        active:scale-95
        ${className || ''}
      `}
      aria-label={`Switch to ${language === 'en' ? 'Hindi' : 'English'}`}
    >
      <span className={language === 'en' ? 'text-[var(--saffron)]' : 'text-white/40'}>EN</span>
      <span className="text-white/20">|</span>
      <span className={language === 'hi' ? 'text-[var(--saffron)]' : 'text-white/40'}>हि</span>
    </button>
  )
}
