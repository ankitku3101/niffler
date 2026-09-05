import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { isControlGroup } from "../src/evaluation/holdout.js";
import { replayControlCase } from "../src/cases/replayControlCase.js";

// Returns every control-group case to DETECTED so it is offered on Agent Run again.
//
// The live route rewinds a case as it finishes, but that only helps cases that were still
// being offered in the first place. Anything consumed before that existed — or stranded by a
// run that died mid-flight — sits in a terminal status where nothing will ever pick it up
// again. This is the repair for those, and it is safe to re-run: a case already at DETECTED
// is skipped.

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

console.log(`Rewinding ${stranded.length} control case(s):`);
let rewound = 0;
for (const c of stranded) {
    const ok = await replayControlCase(dataSource, c.id);
    console.log(`  case ${c.id} (${c.orderId})  ${c.status} -> ${ok ? "DETECTED" : "UNCHANGED"}`);
    if (ok) rewound++;
}

console.log(`\n${rewound} of ${stranded.length} rewound.`);
process.exit(0);
