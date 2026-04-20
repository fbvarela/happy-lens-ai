import { z } from "zod";

export const CritiqueSchema = z.object({
  verdict: z.object({
    score: z.number().int().min(1).max(5).describe("Overall score, 1=weak to 5=excellent."),
    headline: z.string().describe("One-line verdict. Concrete, not generic."),
  }),
  strengths: z.array(z.string()).min(1).max(4),
  issues: z.array(
    z.object({
      area: z.enum(["composition", "light", "focus", "exposure", "color", "motion", "subject", "technical"]),
      observation: z.string(),
    }),
  ).max(5),
  tryNext: z.array(z.string()).min(1).max(5).describe("Concrete, actionable tweaks for next time."),
  recipeTweaks: z.object({
    lens: z.string().nullable().describe("Lens suggestion if switching helps. null if no change."),
    fNumber: z.number().nullable(),
    shutter: z.string().nullable(),
    iso: z.number().int().nullable(),
    ev: z.number().nullable(),
    note: z.string().nullable(),
  }),
});
