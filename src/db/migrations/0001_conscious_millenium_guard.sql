CREATE TABLE "engagement_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
