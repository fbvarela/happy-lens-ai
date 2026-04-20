"use client";

import { useCallback, useEffect, useState } from "react";
import { BUILT_IN_GEAR } from "@/data/gear";

const KEY = "hl.gear.custom.v1";
const ACTIVE_KEY = "hl.gear.active.v1";

function readCustom() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustom(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function useGearStore() {
  const [custom, setCustom] = useState([]);
  const [activeId, setActiveIdState] = useState("iphone-16-pro");

  useEffect(() => {
    setCustom(readCustom());
    try {
      const a = localStorage.getItem(ACTIVE_KEY);
      if (a) setActiveIdState(a);
    } catch {}
  }, []);

  const all = [...BUILT_IN_GEAR, ...custom];
  const active = all.find((g) => g.id === activeId) || BUILT_IN_GEAR[0];

  const setActiveId = useCallback((id) => {
    setActiveIdState(id);
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
  }, []);

  const addCustom = useCallback((gear) => {
    const next = [...readCustom(), { ...gear, custom: true }];
    writeCustom(next);
    setCustom(next);
    return next;
  }, []);

  const removeCustom = useCallback((id) => {
    const next = readCustom().filter((g) => g.id !== id);
    writeCustom(next);
    setCustom(next);
    if (activeId === id) setActiveId(BUILT_IN_GEAR[0].id);
  }, [activeId, setActiveId]);

  return { all, custom, builtIns: BUILT_IN_GEAR, active, activeId, setActiveId, addCustom, removeCustom };
}
