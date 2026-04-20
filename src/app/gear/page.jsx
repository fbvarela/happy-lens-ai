"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useGearStore } from "@/lib/gear-store";
import { LensRingIcon, FlashOnIcon } from "@/components/icons";

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

const EMPTY_GEAR = {
  label: "",
  kind: "dslr",
  bodyNotes: "",
  isoMin: 100,
  isoMax: 25600,
  shutterMin: 1 / 8000,
  shutterMax: 30,
  lensLabel: "",
  lensFocalMin: 18,
  lensFocalMax: 55,
  lensFMin: 3.5,
  lensFMax: 22,
  apAtWide: 3.5,
  apAtTele: 5.6,
  flashLabel: "",
  flashGN: "",
  flashTTL: true,
  flashHSS: false,
};

export default function GearPage() {
  const t = useT();
  const store = useGearStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_GEAR);

  const save = (e) => {
    e.preventDefault();
    if (!form.label || !form.lensLabel) return;
    const gearId = `custom-${slug(form.label)}-${Date.now().toString(36)}`;
    const lensId = `lens-${slug(form.lensLabel)}`;
    const gear = {
      id: gearId,
      label: form.label,
      kind: form.kind,
      bodyNotes: form.bodyNotes || null,
      modes: form.kind === "dslr" ? ["P", "Av", "Tv", "M"] : ["Photo", "Manual"],
      lenses: [{
        id: lensId,
        label: form.lensLabel,
        focalRangeMm: [+form.lensFocalMin, +form.lensFocalMax],
        fNumberMin: +form.lensFMin,
        fNumberMax: +form.lensFMax,
        apertureAtWide: +form.apAtWide,
        apertureAtTele: +form.apAtTele,
        variableAperture: +form.apAtWide !== +form.apAtTele,
      }],
      flashes: form.flashLabel ? [{
        id: `flash-${slug(form.flashLabel)}`,
        label: form.flashLabel,
        guideNumberM: form.flashGN ? +form.flashGN : null,
        ttl: !!form.flashTTL,
        hss: !!form.flashHSS,
        bounce: true,
        swivel: true,
      }] : [],
      iso: { min: +form.isoMin, max: +form.isoMax },
      shutter: { minSec: +form.shutterMin, maxSec: +form.shutterMax },
    };
    store.addCustom(gear);
    store.setActiveId(gearId);
    setForm(EMPTY_GEAR);
    setShowForm(false);
  };

  return (
    <>
      <h1 className="page-title">{t("gear.title")}</h1>
      <p className="page-sub">{t("gear.sub")}</p>

      <section className="gear-list">
        {store.all.map((g) => {
          const active = g.id === store.activeId;
          return (
            <article key={g.id} className={`card gear-card ${active ? "gear-card-active" : ""}`}>
              <div className="recipe-head">
                <div className="card-title" style={{ margin: 0 }}>
                  <span aria-hidden style={{ marginRight: 8 }}>{g.kind === "phone" ? "📱" : g.kind === "dslr" ? "📷" : "🎥"}</span>
                  {g.label}
                </div>
                {active && <span className="badge badge-leaf">{t("gear.active")}</span>}
              </div>
              {g.bodyNotes && <p className="recipe-line" style={{ color: "var(--text-muted)" }}>{g.bodyNotes}</p>}
              <div className="recipe-stat-label" style={{ marginTop: 8 }}>{t("gear.lenses")}</div>
              <ul className="recipe-tips gear-lens-list">
                {g.lenses.map((l) => {
                  const ap = l.fNumberFixed != null ? `f/${l.fNumberFixed}`
                           : l.apertureAtWide != null && l.apertureAtTele != null ? `f/${l.apertureAtWide}–${l.apertureAtTele}`
                           : l.fNumberMin != null ? `f/${l.fNumberMin}–${l.fNumberMax ?? "?"}`
                           : "";
                  return (
                    <li key={l.id} className="gear-lens-row">
                      <LensRingIcon lens={l.id} size={18} className="gear-lens-icon" />
                      <span>{l.label}</span>
                      <span style={{ color: "var(--text-muted)" }}>· {ap}</span>
                    </li>
                  );
                })}
              </ul>
              {g.flashes?.length > 0 && (
                <>
                  <div className="recipe-stat-label" style={{ marginTop: 10 }}>{t("gear.flashes")}</div>
                  <ul className="recipe-tips">
                    {g.flashes.map((f) => (
                      <li key={f.id} className="gear-lens-row">
                        <FlashOnIcon size={16} className="gear-lens-icon" style={{ color: "var(--sun)" }} />
                        <span>{f.label}</span>
                        {f.guideNumberM && <span style={{ color: "var(--text-muted)" }}>· GN {f.guideNumberM}</span>}
                        {f.ttl && <span className="badge badge-sun" style={{ marginLeft: 6 }}>TTL</span>}
                        {f.hss && <span className="badge badge-sun" style={{ marginLeft: 6 }}>HSS</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="recipe-actions">
                {!active && <button type="button" className="btn btn-primary btn-sm" onClick={() => store.setActiveId(g.id)}>{t("gear.useThis")}</button>}
                {g.custom && <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.removeCustom(g.id)}>{t("gear.remove")}</button>}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ marginTop: 20 }}>
        {!showForm && (
          <button type="button" className="btn btn-sun" onClick={() => setShowForm(true)}>
            + {t("gear.addCustom")}
          </button>
        )}
        {showForm && (
          <form className="card coach-card coach-form" onSubmit={save}>
            <div className="coach-section">
              <div className="coach-step-title">{t("gear.form.body")}</div>
              <div className="scene-grid">
                <label className="scene-field full">
                  <span className="input-label">{t("gear.form.label")}</span>
                  <input className="input" value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Pentax K-5" required />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.kind")}</span>
                  <select className="input" value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    <option value="dslr">DSLR</option>
                    <option value="mirrorless">Mirrorless</option>
                    <option value="phone">Phone</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.isoMin")} / {t("gear.form.isoMax")}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="input" type="number" value={form.isoMin} onChange={(e) => setForm({ ...form, isoMin: e.target.value })} />
                    <input className="input" type="number" value={form.isoMax} onChange={(e) => setForm({ ...form, isoMax: e.target.value })} />
                  </div>
                </label>
                <label className="scene-field full">
                  <span className="input-label">{t("gear.form.bodyNotes")}</span>
                  <input className="input" value={form.bodyNotes}
                    onChange={(e) => setForm({ ...form, bodyNotes: e.target.value })}
                    placeholder="APS-C, 16 MP, sensor-shift stabilisation…" />
                </label>
              </div>
            </div>

            <div className="coach-section">
              <div className="coach-step-title">{t("gear.form.lens")}</div>
              <div className="scene-grid">
                <label className="scene-field full">
                  <span className="input-label">{t("gear.form.lensLabel")}</span>
                  <input className="input" value={form.lensLabel}
                    onChange={(e) => setForm({ ...form, lensLabel: e.target.value })}
                    placeholder="SMC Pentax-DA 18-55mm f/3.5-5.6" required />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.focalMin")}</span>
                  <input className="input" type="number" value={form.lensFocalMin}
                    onChange={(e) => setForm({ ...form, lensFocalMin: e.target.value })} />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.focalMax")}</span>
                  <input className="input" type="number" value={form.lensFocalMax}
                    onChange={(e) => setForm({ ...form, lensFocalMax: e.target.value })} />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.apWide")}</span>
                  <input className="input" type="number" step="0.1" value={form.apAtWide}
                    onChange={(e) => setForm({ ...form, apAtWide: e.target.value })} />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.apTele")}</span>
                  <input className="input" type="number" step="0.1" value={form.apAtTele}
                    onChange={(e) => setForm({ ...form, apAtTele: e.target.value })} />
                </label>
              </div>
            </div>

            <div className="coach-section">
              <div className="coach-step-title">{t("gear.form.flash")} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 400 }}>({t("gear.form.optional")})</span></div>
              <div className="scene-grid">
                <label className="scene-field full">
                  <span className="input-label">{t("gear.form.flashLabel")}</span>
                  <input className="input" value={form.flashLabel}
                    onChange={(e) => setForm({ ...form, flashLabel: e.target.value })}
                    placeholder="Metz Mecablitz 52 AF-1" />
                </label>
                <label className="scene-field">
                  <span className="input-label">{t("gear.form.flashGN")}</span>
                  <input className="input" type="number" value={form.flashGN}
                    onChange={(e) => setForm({ ...form, flashGN: e.target.value })} placeholder="52" />
                </label>
                <label className="scene-field" style={{ flexDirection: "row", alignItems: "center" }}>
                  <input type="checkbox" checked={form.flashTTL} onChange={(e) => setForm({ ...form, flashTTL: e.target.checked })} />
                  <span style={{ marginLeft: 6 }}>TTL</span>
                </label>
                <label className="scene-field" style={{ flexDirection: "row", alignItems: "center" }}>
                  <input type="checkbox" checked={form.flashHSS} onChange={(e) => setForm({ ...form, flashHSS: e.target.checked })} />
                  <span style={{ marginLeft: 6 }}>HSS</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary">{t("gear.form.save")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_GEAR); }}>{t("gear.form.cancel")}</button>
            </div>
          </form>
        )}
      </section>

      <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: 13 }}>
        <Link href="/coach">← {t("gear.backToCoach")}</Link>
      </p>
    </>
  );
}
