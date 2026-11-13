import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Runs external programs (Pandoc, later the LaTeX engine) on untrusted input.
 *
 * Guarantees:
 * - No shell. The executable and its arguments are passed as a list, so nothing the
 *   user writes is ever interpreted as a command.
 * - A private, empty working directory that is deleted afterwards.
 * - A minimal environment: no secrets from the server process are inherited.
 * - Hard limits on wall-clock time, CPU time, written file size and captured output.
 */

export interface ProcessLimits {
  /** Wall-clock time before the process is killed. */
  readonly timeoutMs: number;
  /** CPU time before the kernel kills the process. */
  readonly cpuSeconds: number;
  /** Largest file the process may write. */
  readonly maxFileBytes: number;
  /** Most bytes captured from stdout or stderr before the process is killed. */
  readonly maxOutputBytes: number;
}

export interface ProcessRequest {
  /** Absolute path or bare name of the executable. Never built from user input. */
  readonly command: string;
  /** Arguments, each passed verbatim as one argv entry. */
  readonly args: readonly string[];
  /** Data written to the process's standard input. */
  readonly stdin?: string;
  readonly limits: ProcessLimits;
}

export type ProcessFailure = "timeout" | "output-limit" | "not-found" | "spawn-error";

export interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  /** Exit code, or null when the process was killed or never started. */
  readonly exitCode: number | null;
  /** Set when the run did not end with the process exiting on its own. */
  readonly failure?: ProcessFailure;
  readonly durationMs: number;
}

const PRLIMIT_CANDIDATES = ["/usr/bin/prlimit", "/bin/prlimit"];

let prlimitPath: string | null | undefined;

/** `prlimit` enforces kernel resource limits. It exists on Linux, where we deploy. */
function findPrlimit(): string | null {
  if (prlimitPath === undefined) {
    prlimitPath = PRLIMIT_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
    if (prlimitPath === null) {
      console.warn(
        "[sandbox] prlimit not found: CPU and file size limits are not enforced. " +
          "Time and output limits still apply.",
      );
    }
  }
  return prlimitPath;
}

const SEARCH_PATH = ["/usr/local/bin", "/usr/bin", "/bin"];

/**
 * Resolves an executable to an absolute path, searching a fixed list of system
 * directories rather than whatever PATH the server happened to start with.
 */
function resolveExecutable(command: string): string | null {
  const candidates = path.isAbsolute(command)
    ? [command]
    : SEARCH_PATH.map((directory) =>
        // System paths, not project files: nothing here belongs in the bundle trace.
        path.join(/* turbopackIgnore: true */ directory, command),
      );
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * The only variables a job sees. Nothing is inherited from the server process, so its
 * secrets cannot leak. (Typed as a plain record: Next narrows `ProcessEnv` for its own
 * process, which does not describe a child's.)
 */
function sandboxEnv(home: string): NodeJS.ProcessEnv {
  const env: Record<string, string> = {
    PATH: SEARCH_PATH.join(":"),
    LANG: "C.UTF-8",
    HOME: home,
  };
  return env as NodeJS.ProcessEnv;
}

function withResourceLimits(
  executable: string,
  request: ProcessRequest,
): { file: string; args: string[] } {
  const prlimit = findPrlimit();
  if (prlimit === null) return { file: executable, args: [...request.args] };
  return {
    file: prlimit,
    args: [
      `--cpu=${request.limits.cpuSeconds}`,
      `--fsize=${request.limits.maxFileBytes}`,
      "--core=0",
      executable,
      ...request.args,
    ],
  };
}

/** Collects a stream up to a byte budget and reports when the budget is exceeded. */
function createCollector(maxBytes: number, onOverflow: () => void) {
  const chunks: Buffer[] = [];
  let size = 0;
  return {
    push(chunk: Buffer) {
      size += chunk.length;
      if (size > maxBytes) {
        onOverflow();
        return;
      }
      chunks.push(chunk);
    },
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

export async function runProcess(request: ProcessRequest): Promise<ProcessResult> {
  const startedAt = performance.now();
  const executable = resolveExecutable(request.command);
  if (executable === null) {
    return {
      stdout: "",
      stderr: "",
      exitCode: null,
      failure: "not-found",
      durationMs: 0,
    };
  }
  const workDir = await mkdtemp(path.join(tmpdir(), "texflow-job-"));
  const { file, args } = withResourceLimits(executable, request);

  try {
    return await new Promise<ProcessResult>((resolve) => {
      let failure: ProcessFailure | undefined;
      const child = spawn(/* turbopackIgnore: true */ file, args, {
        cwd: workDir,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: sandboxEnv(workDir),
      });

      const kill = (reason: ProcessFailure) => {
        failure ??= reason;
        child.kill("SIGKILL");
      };
      const timer = setTimeout(() => kill("timeout"), request.limits.timeoutMs);
      const stdout = createCollector(request.limits.maxOutputBytes, () =>
        kill("output-limit"),
      );
      const stderr = createCollector(request.limits.maxOutputBytes, () =>
        kill("output-limit"),
      );

      const finish = (exitCode: number | null) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.text(),
          stderr: stderr.text(),
          exitCode: failure ? null : exitCode,
          ...(failure ? { failure } : {}),
          durationMs: Math.round(performance.now() - startedAt),
        });
      };

      child.stdout.on("data", stdout.push);
      child.stderr.on("data", stderr.push);
      child.on("error", () => {
        failure ??= "spawn-error";
        finish(null);
      });
      child.on("close", finish);

      // A process that exits early closes its stdin; that is not an error of ours.
      child.stdin.on("error", () => {});
      child.stdin.end(request.stdin ?? "");
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
