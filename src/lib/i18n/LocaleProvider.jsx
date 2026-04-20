"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICTIONARIES, SUPPORTED, DEFAULT_LOCALE } from "./dictionaries";

const Ctx = createContext({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k) => k });

function pickInitial() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem("hl.locale");
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {}
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

function resolve(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(pickInitial());
    setReady(true);
  }, []);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLocaleState(next);
    try { localStorage.setItem("hl.locale", next); } catch {}
    try { document.documentElement.lang = next; } catch {}
  }, []);

  useEffect(() => {
    if (ready) try { document.documentElement.lang = locale; } catch {}
  }, [locale, ready]);

  const t = useCallback((key, ...args) => {
    const dict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
    const value = resolve(dict, key) ?? resolve(DICTIONARIES[DEFAULT_LOCALE], key);
    if (typeof value === "function") return value(...args);
    return value ?? key;
  }, [locale]);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

export function useT() {
  return useContext(Ctx).t;
}
