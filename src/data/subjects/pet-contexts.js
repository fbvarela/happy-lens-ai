import { Camera, Leaf, Sofa, Activity, BedDouble } from "lucide-react";

export const PET_CONTEXTS = {
  portrait: {
    id: "portrait",
    icon: Camera,
    preferredLens: ["tele2x", "tele5x"],
    shutterFloorSec: 1 / 250,
    isoCeiling: 1600,
    cameraMode: "Portrait",
    hint: "Drop to pet eye level. Tap-to-focus on the eye closer to the lens.",
  },
  garden: {
    id: "garden",
    icon: Leaf,
    preferredLens: ["main", "tele2x"],
    shutterFloorSec: 1 / 500,
    isoCeiling: 800,
    cameraMode: "Photo",
    hint: "Side-light is better than overhead sun; watch for whisker backlight.",
  },
  indoor: {
    id: "indoor",
    icon: Sofa,
    preferredLens: ["main"],
    shutterFloorSec: 1 / 200,
    isoCeiling: 3200,
    cameraMode: "Photo",
    hint: "Open the aperture, bounce any flash off the ceiling. Never direct-flash into the eyes.",
  },
  action: {
    id: "action",
    icon: Activity,
    preferredLens: ["tele2x", "tele5x"],
    shutterFloorSec: 1 / 1000,
    isoCeiling: 6400,
    cameraMode: "Action",
    hint: "Use burst. Pre-focus where the pet will cross (a toy, a door).",
  },
  sleeping: {
    id: "sleeping",
    icon: BedDouble,
    preferredLens: ["main", "tele2x"],
    shutterFloorSec: 1 / 125,
    isoCeiling: 1600,
    cameraMode: "ProRAW",
    hint: "Move slowly; one shutter click can wake a cat. Shoot quiet shutter.",
  },
};

export const PET_ANIMAL_HINTS = {
  cat: "Get below eye level — on the floor, camera tilted up. Leave space above the whiskers.",
  dog: "Match energy — crouch for a small dog, stand ready for a jumping one. Get the eyes sharp.",
  other: "Match the animal's eye line. Leave space in the direction it's looking.",
};

export function resolvePetContext(id) {
  return PET_CONTEXTS[id] || PET_CONTEXTS.portrait;
}

export function resolvePetAnimal(id) {
  return PET_ANIMAL_HINTS[id] ? id : "other";
}
