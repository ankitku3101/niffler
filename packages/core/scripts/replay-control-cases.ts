import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { isControlGroup } from "../src/evaluation/holdout.js";
import { replayControlCase } from "../src/cases/replayControlCase.js";

// Returns control-group cases stranded in a terminal status to DETECTED. Safe to re-run.
//
//   npm run replay-control-cases            preview
//   npm run replay-control-cases -- write   apply
//
// `write` is a bare word on purpose: PowerShell's npm shim swallows a `-- --flag`.
const shouldWrite = process.argv.includes("write");

const dataSource = new JsonPaymentDataSource();
const synthetic = new Set((await dataSource.listOrders()).map((order) => order.id));

const cases = await db.select().from(recoveryCases);
const stranded = cases.filter(
    (c) => synthetic.has(c.orderId) && isControlGroup(c.orderId) && c.status !== "DETECTED"
);

if (stranded.length === 0) {
    console.log("Nothing to do — every control case is already available on Agent Run.");
    process.exit(0);
}

if (!shouldWrite) {
    console.log(`Would rewind ${stranded.length} control case(s):`);
    for (const c of stranded) {
        console.log(`  case ${c.id} (${c.orderId})  ${c.status} -> DETECTED`);
    }
    console.log("\nPreview only — nothing was written.");
    console.log("Re-run as `npm run replay-control-cases -- write` to apply.");
    process.exit(0);
}

console.log(`Rewinding ${stranded.length} control case(s):`);
let rewound = 0;
for (const c of stranded) {
    const ok = await replayControlCase(dataSource, c.id);
    console.log(`  case ${c.id} (${c.orderId})  ${c.status} -> ${ok ? "DETECTED" : "UNCHANGED"}`);
    if (ok) rewound++;
}

console.log(`\n${rewound} of ${stranded.length} rewound.`);
process.exit(0);
