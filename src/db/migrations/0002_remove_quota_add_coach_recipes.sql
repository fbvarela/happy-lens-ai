DROP TABLE "adjustment_quota";

CREATE TABLE "coach_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"recipe_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "coach_recipes_cache_key_unique" UNIQUE("cache_key")
);
