import { pgTable, uuid, text, timestamp, integer, jsonb, date, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adjustmentRecipes = pgTable("adjustment_recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  imageHash: text("image_hash"),
  deviceProfile: text("device_profile"),
  subjectSlug: text("subject_slug"),
  recipeJson: jsonb("recipe_json").notNull(),
  warningsJson: jsonb("warnings_json"),
  thumbnailDataUrl: text("thumbnail_data_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const subjectBaselines = pgTable("subject_baselines", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subjectSlug: text("subject_slug").notNull(),
  displayName: text("display_name").notNull(),
  baselineRecipeJson: jsonb("baseline_recipe_json").notNull(),
  sampleCount: integer("sample_count").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const batchJobs = pgTable("batch_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  photoCount: integer("photo_count").notNull(),
  sharedRecipeJson: jsonb("shared_recipe_json").notNull(),
  perPhotoDeltasJson: jsonb("per_photo_deltas_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adjustmentQuota = pgTable("adjustment_quota", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  day: date("day").notNull(),
  uploadsUsed: integer("uploads_used").notNull().default(0),
  previewsUsed: integer("previews_used").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.day] }),
}));

export const subjectBaselinesUnique = ["user_id", "subject_slug"];
