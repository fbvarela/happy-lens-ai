"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isPremium } from "@/lib/tier";

export default function PremiumGate({ children, feature = "this feature", fallback = null }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && isPremium(user.plan)) return children;
  if (fallback) return fallback;
  return (
    <div className="card">
      <div className="recipe-stat-label">Premium</div>
      <p className="recipe-line">Unlock {feature} on the Premium tier.</p>
      <Link href="/account" className="btn btn-primary">View plans</Link>
    </div>
  );
}
