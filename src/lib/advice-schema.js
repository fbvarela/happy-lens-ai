import { z } from "zod";

export const IphoneHintsSchema = z.object({
  photographicStyle: z.string().nullable().describe("One of the gear's photographicStyles list, or null."),
  format: z.enum(["HEIF", "JPEG", "ProRAW-12", "ProRAW-48", "ProRes"]),
  cameraControlHint: z.string().nullable().describe("Camera Control button gesture hint, null if not faster than on-screen."),
  aeAfLockHint: z.string().nullable().describe("When/how to use AE/AF lock (long-press). Null if not relevant."),
  frontCamera: z.boolean().describe("True when the advice expects the TrueDepth selfie camera."),
  macroOverride: z.boolean().describe("True when the advice uses the ultrawide macro at close focus."),
});

export const ShotAdviceSchema = z.object({
  label: z.string().describe("Short name for this advice variant, e.g. 'Primary' or 'If the light drops'."),
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
    notes: z.string().describe("If use=true: TTL/manual, FEC, bounce, sync. If use=false: 'No flash' or reason."),
  }),
  iphone: IphoneHintsSchema.nullable().describe("iPhone-16-Pro-specific affordances. null for other gear."),
});

export const AdviceResponseSchema = z.object({
  advice: z.array(ShotAdviceSchema).min(1).max(3),
});
