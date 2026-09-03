import { desc, isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { agentRuns } from "../db/schema.js";

export async function getLastFinishedRun() {
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(isNotNull(agentRuns.finishedAt))
    .orderBy(desc(agentRuns.finishedAt))
    .limit(1);
  return run ?? null;
}
