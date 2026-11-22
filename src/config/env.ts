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
  /**
   * PostgreSQL connection string. Optional here so that builds and tests that never
   * touch the database run without one; the database client refuses to start without it.
   */
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "Debe ser una URL postgresql://")
    .optional(),
  /** Signs session tokens. Auth.js reads it directly and refuses to run without it. */
  AUTH_SECRET: z.string().min(32, "Debe tener al menos 32 caracteres").optional(),
  /** GitHub sign-in, offered only when both are set. */
  AUTH_GITHUB_ID: z.string().min(1).optional(),
  AUTH_GITHUB_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PANDOC_PATH: process.env.PANDOC_PATH,
  TECTONIC_PATH: process.env.TECTONIC_PATH,
  TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR,
  SANDBOX_ISOLATION: process.env.SANDBOX_ISOLATION,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

/** Validated environment. Import this instead of reading `process.env` directly. */
export const env = parsed.data;
