import SunCalc from "suncalc";

function iso(d) { return d instanceof Date && !isNaN(d) ? d.toISOString() : null; }

export function dayWindows({ lat, lng, date }) {
  if (lat == null || lng == null) return null;
  const d = date ? new Date(date) : new Date();
  const t = SunCalc.getTimes(d, lat, lng);
  const m = SunCalc.getMoonTimes(d, lat, lng, true);
  const moon = SunCalc.getMoonIllumination(d);
  return {
    sun: {
      sunrise:          iso(t.sunrise),
      sunriseEnd:       iso(t.sunriseEnd),
      goldenHourMorn:   iso(t.goldenHourEnd),
      solarNoon:        iso(t.solarNoon),
      goldenHourEve:    iso(t.goldenHour),
      sunsetStart:      iso(t.sunsetStart),
      sunset:           iso(t.sunset),
      blueHourStart:    iso(t.dusk),
      nauticalDusk:     iso(t.nauticalDusk),
      astroDarkStart:   iso(t.night),
      astroDarkEnd:     iso(t.nightEnd),
    },
    moon: {
      rise:    iso(m.rise),
      set:     iso(m.set),
      phase:   +moon.phase.toFixed(2),
      fraction: +moon.fraction.toFixed(2),
      alwaysUp: !!m.alwaysUp,
      alwaysDown: !!m.alwaysDown,
    },
  };
}

export async function hourlyWeather({ lat, lng, date }) {
  if (lat == null || lng == null) return null;
  const d = date ? new Date(date) : new Date();
  const dayStr = d.toISOString().slice(0, 10);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "temperature_2m,cloud_cover,precipitation,wind_speed_10m,weather_code");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_date", dayStr);
  url.searchParams.set("end_date", dayStr);
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = await res.json();
    const h = data?.hourly;
    if (!h?.time?.length) return null;
    return h.time.map((time, i) => ({
      time,
      tempC: h.temperature_2m?.[i] ?? null,
      cloudCoverPct: h.cloud_cover?.[i] ?? null,
      precipMm: h.precipitation?.[i] ?? null,
      windKph: h.wind_speed_10m?.[i] != null ? +(h.wind_speed_10m[i] * 3.6).toFixed(1) : null,
      weatherCode: h.weather_code?.[i] ?? null,
    }));
  } catch {
    return null;
  }
}
