import { z } from "zod";

export const ShotRecipeSchema = z.object({
  label: z.string().describe("Short name for this recipe variant, e.g. 'Primary' or 'If the light drops'."),
  lens: z.enum(["ultrawide", "main", "tele2x", "tele5x"]),
  fNumber: z.number().describe("Aperture as f-number. Must match the fixed aperture of the chosen lens."),
  shutter: z.string().describe("Shutter speed as a human string, e.g. '1/250s' or '6s'."),
  iso: z.number().int().min(20).max(12800),
  ev: z.number().describe("Exposure compensation in stops, e.g. -1, 0, +0.7."),
  cameraMode: z.enum(["Photo", "Portrait", "Night", "ProRAW", "Cinematic", "Action", "Pano"]),
  focus: z.string().describe("Focus guidance: AF point, tap-to-focus, manual, hyperfocal, etc."),
  stabilization: z.string().describe("Tripod / handheld / lean-against-wall / OIS notes."),
  position: z.string().describe("Where to stand relative to subject and light — direction, distance, height."),
  compositionTips: z.array(z.string()).min(1).max(5),
  warnings: z.array(z.string()),
});

export const RecipeResponseSchema = z.object({
  recipes: z.array(ShotRecipeSchema).min(1).max(3),
});
