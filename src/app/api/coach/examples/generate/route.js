import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "black-forest-labs/flux-schnell";
const SPOTS = {
  hill: {
    prompt: "Photorealistic engagement portrait of a smiling couple embracing on a grassy hillside ridge at golden hour, warm backlit sun, soft clouds behind them, rolling countryside with pasture and trees, natural candid moment, shallow depth of field, professional wedding photography, 85mm look",
  },
  road: {
    prompt: "Photorealistic engagement photo of a couple walking hand in hand along a narrow paved country road, strong leading lines, golden hour side light, trees and green pasture on both sides, candid laughter, professional wedding photography, telephoto compression",
  },
  trees: {
    prompt: "Photorealistic engagement portrait of a couple under large trees in open shade, soft even light with subtle rim light through the leaves, countryside background, candid, natural skin tones, professional wedding photography",
  },
  pasture: {
    prompt: "Wide photorealistic engagement photo of a couple small in frame standing in a green pasture with scattered trees, expansive sky, windblown hair and dress, golden light, environmental portrait, professional wedding photography",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const { spotId = "hill" } = await req.json().catch(() => ({}));
  const spot = SPOTS[spotId] || SPOTS.hill;

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ imageUrl: null, spotId: spotId in SPOTS ? spotId : "hill", source: "stub" });
  }

  try {
    const create = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        input: { prompt: spot.prompt, aspect_ratio: "16:9", output_format: "jpg", output_quality: 85 },
      }),
    });
    const created = await create.json();
    if (!created?.id) {
      return NextResponse.json({ error: created?.detail || "Replicate request failed." }, { status: 502 });
    }
    const imageUrl = await pollPrediction(created.id, apiKey);
    return NextResponse.json({
      imageUrl,
      spotId: spotId in SPOTS ? spotId : "hill",
      source: "replicate",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 502 });
  }
}
