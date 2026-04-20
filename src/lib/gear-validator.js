import { findBuiltIn, BUILT_IN_GEAR } from "@/data/gear";

export function getGearProfile(id) {
  return findBuiltIn(id) || BUILT_IN_GEAR[0];
}

export function resolveGear(incoming) {
  if (incoming && Array.isArray(incoming.lenses)) return incoming;
  return findBuiltIn(incoming?.id) || BUILT_IN_GEAR[0];
}

export function clampRecipeToGear(recipe, gear) {
  const warnings = [...(recipe.warnings || [])];
  const lens =
    gear.lenses.find((l) => l.id === recipe.lens) || gear.lenses[0];

  if (lens.fNumberFixed != null) {
    if (Math.abs(recipe.fNumber - lens.fNumberFixed) > 0.01) {
      warnings.push(
        `Requested f/${recipe.fNumber} isn't achievable on ${lens.label} (fixed f/${lens.fNumberFixed}). Clamped.`,
      );
      recipe.fNumber = lens.fNumberFixed;
    }
  } else if (lens.fNumberMin != null || lens.fNumberMax != null) {
    const min = lens.fNumberMin ?? 1.0;
    const max = lens.fNumberMax ?? 32;
    if (recipe.fNumber < min - 0.01) {
      warnings.push(`f/${recipe.fNumber} wider than ${lens.label} allows (min f/${min}). Clamped.`);
      recipe.fNumber = min;
    } else if (recipe.fNumber > max + 0.01) {
      warnings.push(`f/${recipe.fNumber} narrower than ${lens.label} allows (max f/${max}). Clamped.`);
      recipe.fNumber = max;
    }
  }

  if (gear.iso) {
    if (recipe.iso < gear.iso.min) {
      warnings.push(`ISO ${recipe.iso} below device min ${gear.iso.min}.`);
      recipe.iso = gear.iso.min;
    }
    if (recipe.iso > gear.iso.max) {
      warnings.push(`ISO ${recipe.iso} above device max ${gear.iso.max}.`);
      recipe.iso = gear.iso.max;
    }
  }

  return { ...recipe, lens: lens.id, warnings };
}
