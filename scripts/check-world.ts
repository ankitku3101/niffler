import { makeRng } from "../src/generator/random.js";
import { makeCustomers } from "../src/generator/world.js";
import { CustomerSchema } from "../src/domain/index.js";

const customers = makeCustomers(makeRng("niffler-v1"));

console.log("count:", customers.length);
console.log(customers.slice(0, 5));

// Every record must satisfy the domain schema.
for (const c of customers) CustomerSchema.parse(c);
console.log("all pass CustomerSchema:", true);

console.log("unique ids:", new Set(customers.map((c) => c.id)).size);
console.log("unique emails:", new Set(customers.map((c) => c.email)).size);
