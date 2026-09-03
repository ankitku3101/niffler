import cors from "cors";
import { eq } from "drizzle-orm";
import express from "express";
import { GeminiClient } from "@niffler/core/agent/geminiClient";
import { GroqClient } from "@niffler/core/agent/groqClient";
import { FallbackLlmClient } from "@niffler/core/agent/fallbackClient";
import { JsonPaymentDataSource } from "@niffler/core/data/jsonSource";
import { db } from "@niffler/core/db/client";
import { agentRuns } from "@niffler/core/db/schema";
import { resetRecovery } from "@niffler/core/cases/resetRecovery";
import { generateReport } from "@niffler/core/evaluation/report";
import { runBatch } from "@niffler/core/evaluation/runBatch";
import { getCaseDetail, listCases } from "@niffler/core/evaluation/cases";
import { handlePaymentLinkPaid } from "@niffler/core/webhooks/handlePaymentLinkPaid";
import { verifyWebhookSignature } from "@niffler/core/webhooks/verifySignature";
import { getRunGateStatus, isOwnerToken, PUBLIC_RUN_LIMIT } from "./runGate.js";

const MAX_ATTEMPTS = 3;

// Checked once at startup, not per request.
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("RAZORPAY_WEBHOOK_SECRET is not set — add it to .env before starting the server");
}

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "*" }));

app.get("/report", async (_req, res) => {
  const report = await generateReport(new JsonPaymentDataSource());
  res.json(report);
});

app.get("/run/status", async (_req, res) => {
  res.json(await getRunGateStatus());
});

app.get("/cases", async (_req, res) => {
  const cases = await listCases(new JsonPaymentDataSource());
  res.json(cases);
});

app.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const detail = await getCaseDetail(new JsonPaymentDataSource(), id);
  if (!detail) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(detail);
});

app.post("/run", async (req, res) => {
  const bypass = isOwnerToken(req.header("x-owner-token") ?? undefined);

  if (!bypass) {
    const status = await getRunGateStatus();
    if (!status.canRun) {
      res.status(429).json(status);
      return;
    }
  }

  const [run] = await db
    .insert(agentRuns)
    .values({ caseLimit: PUBLIC_RUN_LIMIT, triggeredBy: bypass ? "owner" : "public" })
    .returning();

  try {
    const dataSource = new JsonPaymentDataSource();
    const llmClient = new FallbackLlmClient(new GroqClient(), new GeminiClient());
    const summary = await runBatch(dataSource, llmClient, MAX_ATTEMPTS, PUBLIC_RUN_LIMIT);

    await db
      .update(agentRuns)
      .set({ finishedAt: new Date(), ...summary })
      .where(eq(agentRuns.id, run!.id));

    res.json({ ok: true, summary });
  } catch (error) {
    await db.update(agentRuns).set({ finishedAt: new Date() }).where(eq(agentRuns.id, run!.id));
    console.error("batch run failed:", error);
    res.status(500).json({ ok: false });
  }
});

// Owner-only, unlike /run — no fallback to the public gate.
app.post("/reset", async (req, res) => {
  if (!isOwnerToken(req.header("x-owner-token") ?? undefined)) {
    res.status(403).json({ error: "owner only" });
    return;
  }

  try {
    const summary = await resetRecovery(new JsonPaymentDataSource());
    res.json({ ok: true, summary });
  } catch (error) {
    console.error("reset failed:", error);
    res.status(500).json({ ok: false });
  }
});

app.post("/webhook/razorpay", express.text({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body as string;
  const signature = req.header("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.warn("webhook signature verification FAILED");
    res.status(400).send("invalid signature");
    return;
  }

  const payload = JSON.parse(rawBody);
  console.log("verified webhook:", payload.event);

  if (payload.event === "payment_link.paid") {
    const result = await handlePaymentLinkPaid(payload);
    console.log(result.handled ? "handled:" : "not handled:", result.reason);
  }

  res.status(200).send("ok");
});

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});

// A batch run is a long-held request by design; don't let Node time it out.
server.requestTimeout = 0;
server.headersTimeout = 0;
