import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

const DEFAULT_GROQ_VISION = "meta-llama/llama-3.2-11b-vision-preview";
const DEFAULT_GEMINI_VISION = "gemini-2.5-flash";

export function hasVisionKey() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

// Gemini first (free vision), Groq as fallback.
export function visionModel() {
  if (process.env.GEMINI_API_KEY) {
    const provider = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return provider(process.env.GEMINI_VISION_MODEL || DEFAULT_GEMINI_VISION);
  }
  if (process.env.GROQ_API_KEY) {
    const provider = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return provider(process.env.GROQ_VISION_MODEL || DEFAULT_GROQ_VISION);
  }
  return null;
}