CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"case_limit" integer NOT NULL,
	"processed" integer,
	"succeeded" integer,
	"failed" integer,
	"triggered_by" text NOT NULL
);
