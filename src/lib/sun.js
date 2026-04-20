import SunCalc from "suncalc";

export function sunSnapshot({ lat, lng, date }) {
  if (lat == null || lng == null) return null;
  const d = date ? new Date(date) : new Date();
  const pos = SunCalc.getPosition(d, lat, lng);
  const times = SunCalc.getTimes(d, lat, lng);
  const moon = SunCalc.getMoonIllumination(d);
  return {
    sun: {
      altitudeDeg: +(pos.altitude * (180 / Math.PI)).toFixed(1),
      azimuthDeg: +(((pos.azimuth * 180) / Math.PI + 180) % 360).toFixed(1),
    },
    times: {
      sunrise: times.sunrise?.toISOString(),
      sunset: times.sunset?.toISOString(),
      goldenHourStart: times.goldenHour?.toISOString(),
      goldenHourEnd: times.goldenHourEnd?.toISOString(),
      nightStart: times.night?.toISOString(),
      nightEnd: times.nightEnd?.toISOString(),
    },
    moon: {
      phase: +moon.phase.toFixed(2),
      fraction: +moon.fraction.toFixed(2),
    },
  };
}
