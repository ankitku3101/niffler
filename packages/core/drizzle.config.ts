import { defineConfig } from "drizzle-kit";

process.loadEnvFile();

const dbUrl = process.env.DATABASE_URL as string

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {url: dbUrl},
});
