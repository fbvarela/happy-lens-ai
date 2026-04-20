export function sceneGuard(subject, sky) {
  const issues = [];
  if (!sky) return issues;
  const alt = sky.sun.altitudeDeg;

  if (subject.id === "astro" && alt > -6) {
    issues.push({
      level: "block",
      message: "Sky isn't dark enough for astro — sun is above astronomical twilight. Try after nightfall.",
    });
  }
  if (subject.id === "lowlight" && alt > 10) {
    issues.push({
      level: "warn",
      message: "It's bright out — low-light preset may over-expose. Consider Photo mode instead.",
    });
  }
  if ((subject.id === "landscape" || subject.id === "portrait") && alt < -6) {
    issues.push({
      level: "warn",
      message: "Sun is well below the horizon — handheld shots will need very high ISO or a tripod.",
    });
  }
  if (subject.id === "pets") {
    if (subject.petContextId === "garden" && alt < 5) {
      issues.push({
        level: "warn",
        message: "Sun is too low for a well-lit garden pet shot — try an earlier window or switch to 'At home'.",
      });
    }
    if (subject.petContextId === "action" && alt < -6) {
      issues.push({
        level: "warn",
        message: "Not enough light for a 1/1000 s shutter freeze — drop to the 'Portrait' context or expect motion blur.",
      });
    }
  }
  return issues;
}
