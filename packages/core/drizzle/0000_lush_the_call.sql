CREATE TYPE "public"."case_status" AS ENUM('DETECTED', 'INVESTIGATING', 'ACTION_PLANNED', 'ACTION_EXECUTED', 'RECOVERED', 'FAILED', 'ESCALATED', 'STOPPED');--> statement-breakpoint
CREATE TABLE "recovery_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"status" "case_status" DEFAULT 'DETECTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_cases_order_id_unique" UNIQUE("order_id")
);
