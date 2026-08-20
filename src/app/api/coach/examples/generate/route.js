import { NextResponse } from "next/server";
import { sunSnapshot } from "@/lib/sun";

export const runtime = "nodejs";

const MODEL = "black-forest-labs/flux-schnell";
// Scene prompts are light-agnostic — the sun-derived lightClause sets the
// actual direction/quality so the preview matches the real time of day.
const SPOTS = {
  hill: {
    prompt: "Photorealistic engagement portrait of a smiling couple embracing on a grassy hillside ridge, soft clouds in the sky, rolling countryside with pasture and trees below, natural candid moment, professional wedding photography",
  },
  road: {
    prompt: "Photorealistic engagement photo of a couple walking hand in hand along a narrow paved country road, strong leading lines, trees and green pasture on both sides, candid laughter, professional wedding photography",
  },
  trees: {
    prompt: "Photorealistic engagement portrait of a couple under large trees, countryside background, candid, natural skin tones, professional wedding photography",
  },
  pasture: {
    prompt: "Wide photorealistic engagement photo of a couple small in frame standing in a green pasture with scattered trees, expansive sky, windblown hair and dress, environmental portrait, professional wedding photography",
  },
};

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
function compass(az) {
  return COMPASS[Math.round(((az % 360) + 360) % 360 / 45) % 8];
}

// Describe the actual sun at the chosen spot/time so the generated photo
// matches the light the photographer will really have that moment.
function lightClause(scene) {
  const sky = sunSnapshot({ lat: scene?.lat, lng: scene?.lng, date: scene?.dateTime });
  if (!sky?.sun) return "natural light";
  const alt = sky.sun.altitudeDeg;
  const dir = compass(sky.sun.azimuthDeg);
  if (alt < -6) return "night scene with no sun — soft available or artificial light, no harsh sunlight";
  if (alt < 8) return `low golden sun in the ${dir} — warm tones, long shadows; shooting toward the sun gives strong backlight and rim light, shooting away is front-lit`;
  if (alt < 30) return `low sun in the ${dir} — warm side light with soft shadows`;
  if (alt < 55) return `moderately high sun in the ${dir} — fairly even but harder light`;
  return `high sun near overhead in the ${dir} — harsh top light, better in open shade`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Describe the gear's most portrait-friendly focal length so the AI never
// generates a shot the user's lens physically can't reach.
function focalClause(gear) {
  const lenses = gear?.lenses;
  if (!Array.isArray(lenses) || !lenses.length) return "shot on the active lens";
  // iPhone-style fixed 35mm-equivalent lenses (focalEq): prefer a short-tele portrait focal.
  const tele = lenses.find((l) => l.focalEq === 48) || lenses.find((l) => l.focalEq && l.focalEq >= 40 && l.focalEq <= 90);
  if (tele?.focalEq) return `shot on a ${tele.focalEq} mm (35mm-equivalent) lens`;
  // Zoom lenses (focalRangeEq): use a ~55mm-equivalent mid/tele position.
  const zoom = lenses.find((l) => l.focalRangeEq && l.focalRangeEq[1] >= 50) || lenses.find((l) => l.focalRangeEq);
  if (zoom?.focalRangeEq) {
    const [a, b] = zoom.focalRangeEq;
    const mm = Math.round((a + b) / 2);
    return `shot on a ${mm} mm (35mm-equivalent) lens`;
  }
  const fixed = lenses.find((l) => l.focalEq);
  if (fixed?.focalEq) return `shot on a ${fixed.focalEq} mm (35mm-equivalent) lens`;
  return "shot on the active lens";
}

async function pollPrediction(id, apiKey) {
  let p = { status: "starting" };
  for (let i = 0; i < 45; i++) {
    if (p.status === "succeeded") break;
    if (p.status === "failed" || p.status === "canceled") throw new Error(p.error || `Replicate ${p.status}.`);
    await sleep(1000);
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    p = await res.json();
  }
  if (p.status !== "succeeded") throw new Error("Replicate timed out.");
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  if (!url) throw new Error("Replicate returned no image.");
  return url;
}

export async function POST(req) {
  const { spotId = "hill", gear, scene } = await req.json().catch(() => ({}));
  const spot = SPOTS[spotId] || SPOTS.hill;
  const prompt = `${spot.prompt}, ${focalClause(gear)}, ${lightClause(scene)}, shallow depth of field`;

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ imageUrl: null, spotId: spotId in SPOTS ? spotId : "hill", source: "stub" });
  }

  try {
    const create = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        input: { prompt, aspect_ratio: "16:9", output_format: "jpg", output_quality: 85 },
      }),
    });
    const created = await create.json();
    if (!created?.id) {
      return NextResponse.json({ error: created?.detail || "Replicate request failed." }, { status: 502 });
    }
    const tempUrl = await pollPrediction(created.id, apiKey);
    // Replicate hands back a signed temp URL; the browser can't read it via
    // fetch (CORS) and it expires in ~24h. Download server-side and return a
    // data URL so the preview renders and the client save path works.
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error("Could not download the generated image.");
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    const imageUrl = `data:image/jpeg;base64,${b64}`;
    return NextResponse.json({
      imageUrl,
      spotId: spotId in SPOTS ? spotId : "hill",
      source: "replicate",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 502 });
  }
}
