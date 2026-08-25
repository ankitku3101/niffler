import { sql } from "drizzle-orm";
import { db } from "../src/db/client.js";

const result = await db.execute(sql`select now() as now, version() as version`);
console.log("connected:", result[0]);

process.exit(0);
