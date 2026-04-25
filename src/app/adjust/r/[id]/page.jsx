"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { getSavedRecipe } from "@/lib/adjust-history";
import RecipeCard, { recipeToText, recipeToShortcutsList } from "../../_components/RecipeCard";

export default function SavedRecipePage({ params }) {
  const { id } = use(params);
  const [saved, setSaved] = useState(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const s = getSavedRecipe(id);
    if (!s) setMissing(true);
    else setSaved(s);
  }, [id]);

  const copy = async (kind, text) => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  if (missing) return (
    <>
      <h1 className="page-title">Recipe not found</h1>
      <p className="page-sub">This permalink only works on the device that saved it. Head back to <Link href="/adjust" className="link">Adjust</Link> to make a new one.</p>
    </>
  );

  if (!saved) return <p className="page-sub">Loading…</p>;

  return (
    <>
      <h1 className="page-title">{saved.recipe.title}</h1>
      <p className="page-sub">
        Saved {new Date(saved.at).toLocaleString()}
        {saved.subject && <> · subject: {saved.subject}</>}
      </p>

      <RecipeCard
        recipe={saved.recipe}
        previewUrl={saved.thumbnail}
        deviceProfile={saved.recipe.deviceProfile}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button type="button" className="btn btn-primary" onClick={() => copy("text", recipeToText(saved.recipe))}>
          {copied === "text" ? "Copied!" : "Copy as text"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => copy("shortcuts", recipeToShortcutsList(saved.recipe))}>
          {copied === "shortcuts" ? "Copied!" : "Copy for Shortcuts"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => copy("link", window.location.href)}>
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
        <Link href="/adjust" className="btn btn-ghost">New photo</Link>
      </div>
    </>
  );
}
