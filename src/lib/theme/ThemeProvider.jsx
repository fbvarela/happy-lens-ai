"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "hl.theme";
const Ctx = createContext({ theme: "light", setTheme: () => {}, toggle: () => {} });

/**
 * Inline, blocking script: resolves the theme before first paint so there is no
 * light→dark flash. Keep in sync with the provider below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

function readTheme() {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  // The inline script already applied the theme; sync React state to it.
  useEffect(() => { setThemeState(readTheme()); }, []);

  const setTheme = useCallback((next) => {
    const value = next === "dark" ? "dark" : "light";
    setThemeState(value);
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
