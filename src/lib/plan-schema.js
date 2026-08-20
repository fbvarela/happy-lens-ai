import { z } from "zod";

export const PlanSlotSchema = z.object({
  time: z.string().describe("ISO datetime within the requested day."),
  subjectId: z.enum(["portrait", "engagement", "landscape", "astro", "macro", "wildlife", "street", "product", "lowlight", "action", "bw"]),
  headline: z.string().describe("Short, specific. What to shoot at this moment."),
  rationale: z.string().describe("Why this time + place matters. One sentence."),
  lens: z.enum(["ultrawide", "main", "tele2x", "tele5x"]),
  cameraMode: z.enum(["Photo", "Portrait", "Night", "ProRAW", "Cinematic", "Action", "Pano"]),
});

export const PlanResponseSchema = z.object({
  summary: z.string().describe("One-paragraph overview of the day's shooting opportunity at this location."),
  slots: z.array(PlanSlotSchema).min(2).max(6),
});
