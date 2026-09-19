#!/usr/bin/env node
/**
 * Contrast audit for the clay / sun / leaf accent families in Happy Lens AI.
 *
 * Parses the palette straight out of src/app/globals.css (tokens, badge rules,
 * dark-theme overrides and field-mode overrides), then checks every mode
 * combination:
 *
 *   - text  : accent as text color vs each surface it appears on   (WCAG 1.4.3, ≥4.5)
 *   - border: accent-family border vs the tinted background        (WCAG 1.4.11, ≥3.0)
 *
 * Static mode needs no browser. Pass --live to additionally render the real
 * elements headlessly and verify the authored colors reach the screen
 * (requires a running `pnpm start` on :3014 and Playwright chromium:
 *   NODE_PATH=<npx playwright cache>/node_modules node scripts/check-contrast.js --live
 * ).
 *
 * Exit code 1 if any check fails — usable in CI.
 */

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "..", "src", "app", "globals.css");
const LIVE = process.argv.includes("--live");
const BASE_URL = "http://localhost:3014";

/* ---------------------------------- WCAG ---------------------------------- */

function luminance(hex) {
  const c = hex.replace("#", "");
  if (c.length !== 6) throw new Error(`Bad hex: ${hex}`);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* ------------------------- CSS parsing (no deps) -------------------------- */

function readCss() {
  return fs.readFileSync(CSS_PATH, "utf8");
}

/** Extract `--name: value` pairs from every `:root... { ... }` block whose
 *  selector matches `matcher` (used to pick base / dark / field variants). */
function tokensFor(css, matcher) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const out = {};
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!matcher(sel)) continue;
    for (const line of m[2].split(";")) {
      const t = line.match(/--([\w-]+)\s*:\s*([^;]+)/);
      if (t) out[`--${t[1]}`] = t[2].trim();
    }
  }
  return out;
}

/** Grab the border-color from a rule like `.badge-clay { ... border-color: X; }`. */
function declValue(css, selectorIncludes, prop) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
    if (!sel.includes(selectorIncludes)) continue;
    const decl = m[2].match(new RegExp(`${prop}\\s*:\\s*([^;]+)`));
    if (decl) return decl[1].trim();
  }
  return null;
}

const resolve = (tokens, v) =>
  v && v.startsWith("var(") ? tokens[v.slice(4, -1)] : v;

/* ------------------------------ Mode matrix ------------------------------- */
/* Mirrors the cascade in globals.css: field mode overrides land after the
   dark-theme block, so field+dark wins over both. */

const THEME_ORDER = ["light", "dark", "field-light", "field-dark"];

function buildModes(css) {
  const base = tokensFor(css, (s) => s === ":root");
  const usability = tokensFor(css, (s) => s.startsWith(":root") && !s.includes("data-"));
  const light = { ...base, ...usability };
  const dark = {
    ...light,
    ...tokensFor(css, (s) => s === ':root[data-theme="dark"]'),
  };
  const fieldLight = {
    ...light,
    ...tokensFor(css, (s) => s === ':root[data-field="on"]'),
  };
  const fieldDark = {
    ...fieldLight,
    ...tokensFor(css, (s) => s === ':root[data-field="on"][data-theme="dark"]'),
  };
  return { light, dark, "field-light": fieldLight, "field-dark": fieldDark };
}

/* --------------------------------- Checks --------------------------------- */

function checkMode(name, t, fails) {
  const row = (label, fg, bg, min) => {
    const cr = contrast(fg, bg);
    const ok = cr >= min;
    if (!ok) fails.push(`${name}: ${label} ${fg} on ${bg} = ${cr.toFixed(2)} (needs ${min})`);
    return ` ${cr.toFixed(2)}${ok ? " ✓" : " ✗"}`;
  };

  const out = [];
  // In dark themes the badge/warning text switches to --clay-light on the DARK
  // tint #432b25 (see [data-theme="dark"] .badge-clay/.recipe-warning rules);
  // --clay on the light tint only applies to light surfaces.
  const isDark = name === "dark" || name === "field-dark";
  out.push(
    " text  " +
      row("accent/clay", t["--clay"], t["--bg"], 4.5) +
      row("clay@cream", t["--clay"], t["--cream"], 4.5) +
      (isDark
        ? row("clayLight@darkTint", t["--clay-light"], "#432b25", 4.5)
        : row("clay@tint", t["--clay"], "#fef0e8", 4.5)) +
      row("clay@surface", t["--clay"], t["--surface"], 4.5)
  );
  out.push(
    " border" +
      row("clay", resolve(t, declValue(readCss(), ".badge-clay", "border-color")) || "", "#fef0e8", 3) +
      row("sun", resolve(t, declValue(readCss(), ".badge-sun", "border-color")) || "", "#fff8e6", 3) +
      row("leaf", resolve(t, declValue(readCss(), ".badge-leaf", "border-color")) || "", "#e8f5ed", 3)
  );
  // Dark-theme borders only apply in dark/field-dark.
  if (name === "dark" || name === "field-dark") {
    const darkCssBlock = readCss();
    out.push(
      " border-dark" +
        row(
          "clay",
          declValue(darkCssBlock, '[data-theme="dark"] .badge-clay', "border-color") || "",
          "#432b25",
          3
        ) +
        row(
          "sun",
          declValue(darkCssBlock, '[data-theme="dark"] .badge-sun', "border-color") || "",
          "#46391e",
          3
        ) +
        row(
          "leaf",
          declValue(darkCssBlock, '[data-theme="dark"] .badge-leaf', "border-color") || "",
          "#203c31",
          3
        )
    );
  }
  console.log(`${name.padEnd(12)}` + out.join("\n" + " ".repeat(12)));
}

/* ------------------------------ Live check -------------------------------- */

async function liveCheck() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error(
      "Playwright not found. Run with NODE_PATH pointing at the npx playwright cache, e.g.\n" +
        '  NODE_PATH=~/.npm/_npx/<hash>/node_modules node scripts/check-contrast.js --live'
    );
    process.exit(2);
  }

  const MODES = [
    { name: "light", theme: "light", field: false },
    { name: "dark", theme: "dark", field: false },
    { name: "field-light", theme: "light", field: true },
    { name: "field-dark", theme: "dark", field: true },
  ];
  const CASES = [
    { sel: ".hero .accent", label: "hero accent" },
    { sel: ".badge-clay", label: "clay badge" },
  ];

  const browser = await chromium.launch();
  let fails = 0;
  for (const mode of MODES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(([t, f]) => {
      localStorage.setItem("hl.theme", t);
      if (f) localStorage.setItem("hl.field", "on");
      else localStorage.removeItem("hl.field");
    }, [mode.theme, mode.field]);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    for (const c of CASES) {
      const el = page.locator(c.sel).first();
      if (!(await el.isVisible())) {
        console.log(`${mode.name.padEnd(12)} ${c.label}: not visible, skipped`);
        continue;
      }
      const res = await el.evaluate((node) => {
        const cs = getComputedStyle(node);
        const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        let bgNode = node, bg = "";
        while (bgNode && bgNode !== document.documentElement) {
          bg = getComputedStyle(bgNode).backgroundColor;
          if (bg && !bg.includes("0, 0, 0, 0")) break;
          bgNode = bgNode.parentElement;
        }
        return { fg: parse(cs.color), bg: bgNode ? parse(bg) : [255, 255, 255] };
      });
      const buf = await el.screenshot();
      const px = await page.evaluate(async (data) => {
        const img = new Image();
        img.src = "data:image/png;base64," + data.b64;
        await new Promise((r) => { img.onload = r; });
        const cv = document.createElement("canvas");
        cv.width = img.width; cv.height = img.height;
        const g = cv.getContext("2d");
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        let hits = 0, total = 0;
        const [tr, tg, tb] = data.target;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          total++;
          if (Math.hypot(d[i] - tr, d[i + 1] - tg, d[i + 2] - tb) < 60) hits++;
        }
        return total ? (hits / total) * 100 : 0;
      }, { b64: buf.toString("base64"), target: res.fg });

      const lum2 = ([r, g, b]) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const cr = (() => {
        const [a, b] = [lum2(res.fg), lum2(res.bg)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      })();

      const okCr = cr >= 4.5;
      const okPx = px >= 0.5;
      if (!okCr || !okPx) fails++;
      console.log(
        `${mode.name.padEnd(12)} ${c.label.padEnd(12)} contrast ${cr.toFixed(2)}:${okCr ? " ✓" : " ✗"}  rendered ${okPx ? "✓" : "✗"} (${px.toFixed(1)}% px)`
      );
    }
    await ctx.close();
  }
  await browser.close();
  return fails;
}

/* ---------------------------------- main ----------------------------------- */

function main() {
  const css = readCss();
  const modes = buildModes(css);

  const fails = [];
  console.log("Static token audit (globals.css):\n");
  for (const name of THEME_ORDER) {
    checkMode(name, modes[name], fails);
  }

  if (LIVE) {
    console.log("\nLive rendered check (requires server on :3014):\n");
    liveCheck()
      .then((liveFails) => {
        report(fails.length + liveFails);
      })
      .catch((e) => {
        console.error("Live check error:", e.message);
        report(fails.length + 1);
      });
  } else {
    report(fails.length);
  }
}

function report(n) {
  if (n) {
    console.error(`\n✗ ${n} contrast failure(s)`);
    process.exit(1);
  }
  console.log("\n✓ all contrast checks pass");
  process.exit(0);
}

main();
