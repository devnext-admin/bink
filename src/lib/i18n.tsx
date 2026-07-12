import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { ar } from './translations/ar';

export type Lang = 'en' | 'ar';
const LANG_KEY = 'bink.lang';

interface I18nValue {
  lang: Lang;
  isRTL: boolean;
  /** Translate a UI string. English text is the key; `{name}` vars interpolate. */
  t: (s: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

function applyDirection(lang: Lang) {
  const rtl = lang === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
  } else {
    // Native applies direction on the next app reload
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
  }
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  let out = s;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        const l: Lang = v === 'ar' ? 'ar' : 'en';
        setLangState(l);
        applyDirection(l);
      })
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    applyDirection(l);
    await AsyncStorage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback(
    (s: string, vars?: Record<string, string | number>) =>
      interpolate(lang === 'ar' ? (ar[s] ?? s) : s, vars),
    [lang]
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, isRTL: lang === 'ar', t, setLang }),
    [lang, t, setLang]
  );

  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Locale-aware date formatting (Gregorian calendar in both languages). */
export function formatDate(
  lang: Lang,
  date: Date | string,
  opts: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-US', opts);
}
