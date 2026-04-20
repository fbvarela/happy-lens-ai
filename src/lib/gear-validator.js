import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";

export function getGearProfile(id) {
  if (id === "iphone-16-pro" || !id) return IPHONE_16_PRO;
  return IPHONE_16_PRO;
}

export function clampRecipeToGear(recipe, gear) {
  const warnings = [...(recipe.warnings || [])];
  const lens = gear.lenses.find((l) => l.id === recipe.lens) || gear.lenses[0];

  if (lens.fNumberFixed && Math.abs(recipe.fNumber - lens.fNumberFixed) > 0.01) {
    warnings.push(
      `Requested f/${recipe.fNumber} isn't achievable on ${lens.label} (fixed f/${lens.fNumberFixed}). Clamped.`,
    );
    recipe.fNumber = lens.fNumberFixed;
  }

  if (recipe.iso < gear.iso.min) {
    warnings.push(`ISO ${recipe.iso} below device min ${gear.iso.min}.`);
    recipe.iso = gear.iso.min;
  }
  if (recipe.iso > gear.iso.max) {
    warnings.push(`ISO ${recipe.iso} above device max ${gear.iso.max}.`);
    recipe.iso = gear.iso.max;
  }

  return { ...recipe, lens: lens.id, warnings };
}
