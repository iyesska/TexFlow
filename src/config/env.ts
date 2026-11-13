import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  /** Pandoc executable: a bare name looked up in the system directories, or a path. */
  PANDOC_PATH: z.string().min(1).default("pandoc"),
  /** Tectonic executable, resolved like PANDOC_PATH. */
  TECTONIC_PATH: z.string().min(1).default("tectonic"),
  /** Where Tectonic keeps the LaTeX packages downloaded by scripts/setup-tectonic.sh. */
  TECTONIC_CACHE_DIR: z.string().min(1).default("/var/cache/texflow/tectonic"),
  /**
   * "required": PDF compilation refuses to run unless the host can isolate the LaTeX
   * process. "disabled" lifts that, which lets a document read the server's files:
   * only for a machine where every document is your own.
   */
  SANDBOX_ISOLATION: z.enum(["required", "disabled"]).default("required"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PANDOC_PATH: process.env.PANDOC_PATH,
  TECTONIC_PATH: process.env.TECTONIC_PATH,
  TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR,
  SANDBOX_ISOLATION: process.env.SANDBOX_ISOLATION,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

/** Validated environment. Import this instead of reading `process.env` directly. */
export const env = parsed.data;
