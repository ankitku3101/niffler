import { desc, isNull } from "drizzle-orm";
import { db } from "@niffler/core/db/client";
import { agentRuns } from "@niffler/core/db/schema";

// Global, not per-visitor — bounds total LLM spend regardless of traffic.
export const COOLDOWN_MINUTES = 15;
export const PUBLIC_RUN_LIMIT = 10;

export interface RunGateStatus {
  canRun: boolean;
  reason?: "cooldown" | "in_progress";
  nextAvailableAt?: string;
}

export async function getRunGateStatus(): Promise<RunGateStatus> {
  const [inProgress] = await db
    .select()
    .from(agentRuns)
    .where(isNull(agentRuns.finishedAt))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  if (inProgress) {
    return { canRun: false, reason: "in_progress" };
  }

  const [lastRun] = await db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(1);
  if (!lastRun) {
    return { canRun: true };
  }

  const nextAvailableAt = new Date(lastRun.startedAt.getTime() + COOLDOWN_MINUTES * 60_000);
  if (nextAvailableAt.getTime() > Date.now()) {
    return { canRun: false, reason: "cooldown", nextAvailableAt: nextAvailableAt.toISOString() };
  }

  return { canRun: true };
}

// A static secret, not an auth system — lets a demo bypass the public cooldown.
export function isOwnerToken(token: string | undefined): boolean {
  const secret = process.env.OWNER_BYPASS_TOKEN;
  return Boolean(secret) && token === secret;
}
