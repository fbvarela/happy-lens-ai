export const DEVICE_PROFILES = {
  "iphone-16-pro": {
    id: "iphone-16-pro",
    label: "iPhone 16 Pro",
    photographicStylesVersion: 2,
    supportsLiDARDepth: true,
  },
  "iphone-15-pro": {
    id: "iphone-15-pro",
    label: "iPhone 15 Pro",
    photographicStylesVersion: 1,
    supportsLiDARDepth: true,
    unsupportedStyles: ["Amber", "Gold", "Rose Gold", "Luminous", "Quiet", "Cozy", "Ethereal"],
    unsupportedPortraitLighting: ["High-Key Mono"],
  },
  "iphone-generic": {
    id: "iphone-generic",
    label: "iPhone (generic)",
    photographicStylesVersion: 1,
    supportsLiDARDepth: false,
  },
  "generic": {
    id: "generic",
    label: "Generic",
    photographicStylesVersion: 0,
    supportsLiDARDepth: false,
  },
};

export function detectDeviceProfile(exif) {
  const model = exif?.Model || "";
  if (/iPhone 16 Pro/i.test(model)) return DEVICE_PROFILES["iphone-16-pro"];
  if (/iPhone 15 Pro/i.test(model)) return DEVICE_PROFILES["iphone-15-pro"];
  if (/iPhone/i.test(model)) return DEVICE_PROFILES["iphone-generic"];
  return DEVICE_PROFILES["generic"];
}
