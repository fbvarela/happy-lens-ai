import SunCalc from "suncalc";
import { Clock, Sunset, CloudMoon, Stars } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalInput(date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function nextAfter(times, after, key) {
  const t = times[key];
  if (t && t > after) return t;
  return null;
}

export function TIME_PRESETS() {
  return [
    { id: "now", label: "Now", icon: Clock },
    { id: "golden", label: "Golden hour", icon: Sunset },
    { id: "blue", label: "Blue hour", icon: CloudMoon },
    { id: "astro", label: "Astro tonight", icon: Stars },
  ];
}

export function resolveTimePreset(id, { lat, lng, from = new Date() } = {}) {
  if (id === "now") return { dateTime: toLocalInput(from), label: "Now" };
  if (lat == null || lng == null) {
    return { error: "Enter a latitude and longitude first." };
  }

  const windowDays = 2;
  for (let d = 0; d < windowDays; d++) {
    const day = new Date(from.getTime() + d * DAY_MS);
    const times = SunCalc.getTimes(day, lat, lng);
    let hit = null;
    let label = "";
    if (id === "golden") {
      hit = nextAfter(times, from, "goldenHour") || nextAfter(times, from, "goldenHourEnd");
      label = "Golden hour";
    } else if (id === "blue") {
      hit = nextAfter(times, from, "dusk") || nextAfter(times, from, "nauticalDusk");
      label = "Blue hour";
    } else if (id === "astro") {
      hit = nextAfter(times, from, "night") || nextAfter(times, from, "nauticalDusk");
      label = "Astro tonight";
    }
    if (hit) return { dateTime: toLocalInput(hit), label };
  }

  return { error: "No matching window in the next 48h at this latitude." };
}
