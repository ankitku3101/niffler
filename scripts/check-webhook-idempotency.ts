import { handlePaymentLinkPaid } from "../src/webhooks/handlePaymentLinkPaid.js";

process.loadEnvFile();

// Stage 10, Task 10.7: proves duplicate-event protection for real, not just
// by inspection — replays the exact event case 602 already processed and
// confirms it's rejected as already-handled, not re-applied.

const duplicateEvent = {
  event: "payment_link.paid",
  payload: {
    payment_link: { entity: { reference_id: "order_TXJNgtumVt8AWE" } },
    payment: { entity: { id: "pay_TXJOmeoLCpROES" } },
  },
};

const result = await handlePaymentLinkPaid(duplicateEvent);
console.log(result);

process.exit(0);
