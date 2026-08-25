import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
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