import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  /** Pandoc executable: a bare name looked up in the system directories, or a path. */
  PANDOC_PATH: z.string().min(1).default("pandoc"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PANDOC_PATH: process.env.PANDOC_PATH,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

/** Validated environment. Import this instead of reading `process.env` directly. */
export const env = parsed.data;
