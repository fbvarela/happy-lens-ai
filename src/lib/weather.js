const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export async function weatherSnapshot({ lat, lng, date }) {
  if (lat == null || lng == null) return null;
  const when = date ? new Date(date) : new Date();
  const iso = when.toISOString();
  const hour = iso.slice(0, 13) + ":00";
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "temperature_2m,cloud_cover,precipitation,wind_speed_10m,weather_code");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("start_hour", hour);
  url.searchParams.set("end_hour", hour);
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = await res.json();
    const h = data?.hourly;
    if (!h?.time?.length) return null;
    return {
      tempC: h.temperature_2m?.[0] ?? null,
      cloudCoverPct: h.cloud_cover?.[0] ?? null,
      precipMm: h.precipitation?.[0] ?? null,
      windKph: h.wind_speed_10m?.[0] != null ? +(h.wind_speed_10m[0] * 3.6).toFixed(1) : null,
      weatherCode: h.weather_code?.[0] ?? null,
      label: describeWeather(h.weather_code?.[0], h.cloud_cover?.[0]),
    };
  } catch {
    return null;
  }
}

function describeWeather(code, cloud) {
  if (code == null) return null;
  if ([0].includes(code)) return cloud > 25 ? "Mostly clear" : "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if ([3].includes(code)) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return null;
}
