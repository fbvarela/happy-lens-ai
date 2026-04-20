import { z } from "zod";

export const ShotRecipeSchema = z.object({
  label: z.string().describe("Short name for this recipe variant, e.g. 'Primary' or 'If the light drops'."),
  lens: z.string().describe("Must match one of the gear's lens ids."),
  fNumber: z.number().describe("Aperture as f-number. Must be achievable on the chosen lens."),
  shutter: z.string().describe("Shutter speed as a human string, e.g. '1/250s' or '6s'."),
  iso: z.number().int().describe("ISO within the device's supported range."),
  ev: z.number().describe("Exposure compensation in stops, e.g. -1, 0, +0.7."),
  cameraMode: z.string().describe("Mode string from the gear's modes/exposureModes list."),
  focus: z.string(),
  stabilization: z.string(),
  position: z.string(),
  compositionTips: z.array(z.string()).min(1).max(5),
  warnings: z.array(z.string()),
  flash: z.object({
    use: z.boolean(),
    notes: z.string().describe("If use=true: TTL/manual, FEC (e.g. -1 EV), bounce direction, sync type. If use=false: 'No flash' or why."),
  }),
});

export const RecipeResponseSchema = z.object({
  recipes: z.array(ShotRecipeSchema).min(1).max(3),
});
