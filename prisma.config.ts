import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The same files Next.js reads, most specific first.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Runs with the react-server condition so server modules (which import
    // "server-only") can be shared with the seed.
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
