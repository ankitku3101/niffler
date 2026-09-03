import { createRecoveryCases } from "../src/cases/createCases.js";

process.loadEnvFile();

// Stage 10, Task 10.4: creates the one RecoveryCase row for our real
// Razorpay demo order, using the same idempotent insert every synthetic
// case already goes through — no new logic, safe to re-run.

const ORDER_ID = "order_TXHdgsGhT8mG05";

const count = await createRecoveryCases([ORDER_ID]);
console.log(count === 1 ? "inserted 1 new case" : "already existed, inserted 0");

process.exit(0);
