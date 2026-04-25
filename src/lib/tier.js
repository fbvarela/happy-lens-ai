export const PLANS = ["free", "premium", "bundle"];

export function isPremium(plan) {
  return plan === "premium" || plan === "bundle";
}

export const FREE_LIMITS = {
  ADJUSTMENTS_PER_DAY: 5,
  PREVIEWS_PER_DAY: 3,
  BATCH_PHOTOS_MAX: 5,
  HISTORY_MAX: 10,
};

export const PREMIUM_LIMITS = {
  BATCH_PHOTOS_MAX: 12,
};

export function uploadsPerDay(plan) {
  return isPremium(plan) ? Infinity : FREE_LIMITS.ADJUSTMENTS_PER_DAY;
}
