export function calculateDof({ focalLengthMm, aperture, focusDistanceM, circleOfConfusionMm }) {
  if (!focusDistanceM || focusDistanceM <= 0.2) return null;
  const hyperfocalM = (focalLengthMm ** 2) / (aperture * circleOfConfusionMm) / 1000;
  if (focusDistanceM === Infinity) return { near: hyperfocalM, far: Infinity, hyperfocal: hyperfocalM };
  return {
    near: (hyperfocalM * focusDistanceM) / (hyperfocalM + focusDistanceM),
    far: focusDistanceM < hyperfocalM
      ? (hyperfocalM * focusDistanceM) / (hyperfocalM - focusDistanceM)
      : Infinity,
    hyperfocal: hyperfocalM,
  };
}

export function recommendExposure({
  apertureMin,
  apertureMax,
  shutterFloorSec,
  shutterOptions,
  isoMin,
  isoMax,
  focalLengthMm,
  cropFactor = 1,
  sunAltitudeDeg,
  cloudCoverPct = 0,
  lightMode,
  focusDistanceM,
  subjectDistancesM = [],
  circleOfConfusionMm,
}) {
  const reasons = [];
  const warnings = [];
  const coc = circleOfConfusionMm ?? 0.03 / cropFactor;
  const validDistances = subjectDistancesM.filter((distance) => distance > 0.2);
  const nearest = Math.min(...validDistances);
  const farthest = Math.max(...validDistances);
  let aperture = apertureMin;

  for (let candidate = apertureMin; candidate <= apertureMax; candidate += 0.1) {
    const dof = calculateDof({ focalLengthMm, aperture: candidate, focusDistanceM, circleOfConfusionMm: coc });
    if (!dof || (dof.near <= nearest && (dof.far === Infinity || dof.far >= farthest))) {
      aperture = +candidate.toFixed(1);
      break;
    }
  }
  if (aperture >= apertureMax && validDistances.length > 1) {
    warnings.push("dof_limit");
    reasons.push("dof");
  }

  const lightEv = Math.max(5, Math.min(15,
    8 + Math.max(0, sunAltitudeDeg ?? 20) * 0.1
    - cloudCoverPct * 0.025
    - (lightMode === "backlit" ? 1 : lightMode === "side" ? 0.3 : 0),
  ));
  if (cloudCoverPct >= 60) reasons.push("cloud_cover");
  if (lightMode === "backlit") reasons.push("backlit");

  const motionDenominator = Math.round(1 / (shutterFloorSec || 1 / 125));
  const handholdDenominator = Math.ceil(focalLengthMm * cropFactor);
  const minimumDenominator = Math.max(1, motionDenominator, handholdDenominator);
  const targetDenominator = Math.max(minimumDenominator, (200 * 2 ** lightEv) / (100 * aperture ** 2));
  const shutterDenominator = shutterOptions.reduce((best, denominator) => (
    Math.abs(Math.log2(denominator) - Math.log2(targetDenominator))
      < Math.abs(Math.log2(best) - Math.log2(targetDenominator)) ? denominator : best
  ), shutterOptions[0]);
  const rawIso = 100 * aperture ** 2 * shutterDenominator / 2 ** lightEv;
  const iso = Math.max(isoMin, Math.min(isoMax, Math.round(rawIso)));
  if (iso === isoMax && rawIso > isoMax) {
    warnings.push("iso_limit");
    reasons.push("low_light");
  }
  if (shutterDenominator === minimumDenominator) {
    reasons.push(handholdDenominator >= motionDenominator ? "telephoto" : "motion");
  }

  return {
    aperture,
    shutterDenominator,
    iso,
    lightEv,
    dof: calculateDof({ focalLengthMm, aperture, focusDistanceM, circleOfConfusionMm: coc }),
    reasons: [...new Set(reasons)],
    warnings: [...new Set(warnings)],
  };
}
