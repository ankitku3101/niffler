import cors from "cors";
import { eq } from "drizzle-orm";
import express from "express";
import Razorpay from "razorpay";
import { GeminiClient } from "@niffler/core/agent/geminiClient";
import { GroqClient } from "@niffler/core/agent/groqClient";
import { FallbackLlmClient } from "@niffler/core/agent/fallbackClient";
import { recoverCase } from "@niffler/core/agent/recoverCase";
import type { RecoveryStep } from "@niffler/core/agent/recoveryStep";
import { createRecoveryCases } from "@niffler/core/cases/createCases";
import { JsonPaymentDataSource } from "@niffler/core/data/jsonSource";
import { RazorpayDataSource } from "@niffler/core/data/razorpayDataSource";
import { db } from "@niffler/core/db/client";
import { agentRuns, recoveryCases } from "@niffler/core/db/schema";
import { resetRecovery } from "@niffler/core/cases/resetRecovery";
import { generateReport } from "@niffler/core/evaluation/report";
import { runBatch } from "@niffler/core/evaluation/runBatch";
import { getCaseDetail, listCases } from "@niffler/core/evaluation/cases";
import { getLastFinishedRun } from "@niffler/core/evaluation/lastRun";
import { handlePaymentLinkPaid } from "@niffler/core/webhooks/handlePaymentLinkPaid";
import { verifyWebhookSignature } from "@niffler/core/webhooks/verifySignature";
import { getRunGateStatus, isOwnerToken, PUBLIC_RUN_LIMIT } from "./runGate.js";

const MAX_ATTEMPTS = 3;
const SIMULATION_AMOUNT_PAISE = 29900;

// Checked once at startup, not per request.
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("RAZORPAY_WEBHOOK_SECRET is not set — add it to .env before starting the server");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "*" }));

app.get("/report", async (_req, res) => {
  const report = await generateReport(new JsonPaymentDataSource());
  res.json(report);
});

app.get("/run/status", async (_req, res) => {
  res.json(await getRunGateStatus());
});

app.get("/run/last", async (_req, res) => {
  res.json(await getLastFinishedRun());
});

app.get("/cases", async (_req, res) => {
  const cases = await listCases(new JsonPaymentDataSource(), new RazorpayDataSource());
  res.json(cases);
});

app.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const detail = await getCaseDetail(new JsonPaymentDataSource(), id, new RazorpayDataSource());
  if (!detail) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(detail);
});

// Streams one case's recovery live over SSE; ?source=razorpay targets a real order instead of the synthetic dataset.
app.get("/cases/:id/live", async (req, res) => {
  const id = Number(req.params.id);
  const useRazorpay = req.query.source === "razorpay";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onStep = (step: RecoveryStep) => send("step", step);

  try {
    const dataSource = useRazorpay ? new RazorpayDataSource() : new JsonPaymentDataSource();
    const llmClient = new FallbackLlmClient(new GroqClient(), new GeminiClient());
    const result = await recoverCase(dataSource, id, llmClient, MAX_ATTEMPTS, onStep);
    send("done", result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send("failed", { message });
  } finally {
    res.end();
  }
});

// Automatic capture, unlike check-razorpay.ts — a successful payment here needs no recovery.
app.post("/simulate/order", async (_req, res) => {
  const order = await razorpay.orders.create({
    amount: SIMULATION_AMOUNT_PAISE,
    currency: "INR",
    receipt: `sim_${Date.now()}`,
  });
  res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amountPaise: SIMULATION_AMOUNT_PAISE });
});

app.get("/simulate/order/:orderId/status", async (req, res) => {
  const order = await new RazorpayDataSource().getOrder(req.params.orderId!);
  if (!order) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ status: order.status });
});

// Idempotent — safe to call again if the frontend retries.
app.post("/simulate/order/:orderId/case", async (req, res) => {
  const orderId = req.params.orderId!;
  await createRecoveryCases([orderId]);
  const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.orderId, orderId)).limit(1);
  if (!caseRow) {
    res.status(500).json({ error: "case creation failed" });
    return;
  }
  res.json({ caseId: caseRow.id, status: caseRow.status });
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
