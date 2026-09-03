import { pgTable, serial, text, timestamp, pgEnum, jsonb, integer } from "drizzle-orm/pg-core";
import { CaseStatusSchema, type CaseStatus } from "../domain/recoveryCase.js";

export const recoveryCasesEnum = pgEnum(
  "case_status",
  CaseStatusSchema.options as [CaseStatus, ...CaseStatus[]]
);

export const recoveryCases = pgTable("recovery_cases", {
    id: serial("id").primaryKey(),
    orderId: text("order_id").notNull().unique(),
    status: recoveryCasesEnum("status").notNull().default("DETECTED"),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
})

export const auditLog = pgTable("audit_log", {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").references(() => recoveryCases.id, {
        onDelete: "restrict"
    }).notNull(),
    toolName: text("tool_name").notNull(),
    input: jsonb().notNull(),
    output: jsonb().notNull(),
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow()
})

// One row per RUN RECOVERY AGENT click; finishedAt is null while in progress.
export const agentRuns = pgTable("agent_runs", {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", {withTimezone: true}).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", {withTimezone: true}),
    caseLimit: integer("case_limit").notNull(),
    processed: integer("processed"),
    succeeded: integer("succeeded"),
    failed: integer("failed"),
    triggeredBy: text("triggered_by").notNull(),
})