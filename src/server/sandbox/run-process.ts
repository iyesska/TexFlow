import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { env } from "@/config/env";

import { findIsolation, isolatedCommand, SANDBOX_WORK_DIR } from "./isolation";

/**
 * Runs external programs (Pandoc, the LaTeX engine) on untrusted input.
 *
 * Guarantees:
 * - No shell. The executable and its arguments are passed as a list, so nothing the
 *   user writes is ever interpreted as a command.
 * - A private working directory that is deleted afterwards.
 * - A minimal environment: no secrets from the server process are inherited.
 * - Hard limits on wall-clock time, CPU time, memory, written file size and output.
 * - OS-level isolation where the host supports it (see ./isolation): the job cannot
 *   see the rest of the file system or reach the network.
 */

export interface ProcessLimits {
  /** Wall-clock time before the process is killed. */
  readonly timeoutMs: number;
  /** CPU time before the kernel kills the process. */
  readonly cpuSeconds: number;
  /** Largest file the process may write, and the largest output file read back. */
  readonly maxFileBytes: number;
  /** Most bytes captured from stdout or stderr before the process is killed. */
  readonly maxOutputBytes: number;
  /** Address-space limit. Omit for runtimes that reserve memory they never use. */
  readonly maxMemoryBytes?: number;
}

export interface JobFile {
  /** A plain file name: no directories. */
  readonly name: string;
  readonly data: string | Uint8Array;
}

export interface ProcessRequest {
  /** Absolute path or bare name of the executable. Never built from user input. */
  readonly command: string;
  /** Arguments, each passed verbatim as one argv entry. */
  readonly args: readonly string[];
  /** Data written to the process's standard input. */
  readonly stdin?: string;
  readonly limits: ProcessLimits;
  /**
   * "required": refuse to run without OS-level isolation. For programs, such as the
   * LaTeX engine, that would otherwise let the input read files.
   * "preferred": isolate when the host can, run with the other guarantees when not.
   */
  readonly isolation: "required" | "preferred";
  /** Files placed in the working directory before the run. */
  readonly files?: readonly JobFile[];
  /** Names of files to read back from the working directory after the run. */
  readonly collect?: readonly string[];
  /** Host paths the job may read, in addition to the system directories. */
  readonly readOnlyPaths?: readonly string[];
  /** Extra environment variables, chosen by the server. */
  readonly env?: Readonly<Record<string, string>>;
  /** Kills the process when aborted, e.g. because the client went away. */
  readonly signal?: AbortSignal;
}

export type ProcessFailure =
  | "timeout"
  | "output-limit"
  | "not-found"
  | "spawn-error"
  | "isolation-unavailable"
  | "aborted";

export interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  /** Exit code, or null when the process was killed or never started. */
  readonly exitCode: number | null;
  /** Set when the run did not end with the process exiting on its own. */
  readonly failure?: ProcessFailure;
  /** The collected files that exist and fit the size limit. */
  readonly outputs: ReadonlyMap<string, Buffer>;
  readonly durationMs: number;
}

const PRLIMIT_CANDIDATES = ["/usr/bin/prlimit", "/bin/prlimit"];
const SEARCH_PATH = ["/usr/local/bin", "/usr/bin", "/bin"];
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const NO_OUTPUTS: ReadonlyMap<string, Buffer> = new Map();

let prlimitPath: string | null | undefined;

/** `prlimit` enforces kernel resource limits. It exists on Linux, where we deploy. */
function findPrlimit(): string | null {
  if (prlimitPath === undefined) {
    prlimitPath = PRLIMIT_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
    if (prlimitPath === null) {
      console.warn(
        "[sandbox] prlimit not found: CPU, memory and file size limits are not enforced. " +
          "Time and output limits still apply.",
      );
    }
  }
  return prlimitPath;
}

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

function withResourceLimits(
  command: { file: string; args: string[] },
  limits: ProcessLimits,
): { file: string; args: string[] } {
  const prlimit = findPrlimit();
  if (prlimit === null) return command;
  return {
    file: prlimit,
    args: [
      `--cpu=${limits.cpuSeconds}`,
      `--fsize=${limits.maxFileBytes}`,
      ...(limits.maxMemoryBytes ? [`--as=${limits.maxMemoryBytes}`] : []),
      "--core=0",
      command.file,
      ...command.args,
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

function failed(failure: ProcessFailure): ProcessResult {
  return {
    stdout: "",
    stderr: "",
    exitCode: null,
    failure,
    outputs: NO_OUTPUTS,
    durationMs: 0,
  };
}

async function writeJobFiles(workDir: string, files: readonly JobFile[]): Promise<void> {
  for (const file of files) {
    if (!SAFE_FILE_NAME.test(file.name)) {
      throw new Error(`Unsafe job file name: ${JSON.stringify(file.name)}`);
    }
    await writeFile(path.join(/* turbopackIgnore: true */ workDir, file.name), file.data);
  }
}

async function collectOutputs(
  workDir: string,
  names: readonly string[],
  maxBytes: number,
): Promise<ReadonlyMap<string, Buffer>> {
  const outputs = new Map<string, Buffer>();
  for (const name of names) {
    if (!SAFE_FILE_NAME.test(name)) continue;
    const file = path.join(/* turbopackIgnore: true */ workDir, name);
    try {
      // lstat, not stat: the job could leave a symlink to a file of the host under an
      // expected name, and this code runs outside the sandbox.
      const info = await lstat(file);
      if (info.isFile() && info.size <= maxBytes) outputs.set(name, await readFile(file));
    } catch {
      // The job did not produce this file.
    }
  }
  return outputs;
}

/** What the job sees when it is not isolated: its directory and a bare environment. */
function plainEnvironment(workDir: string, extra: Readonly<Record<string, string>>) {
  const variables: Record<string, string> = {
    PATH: SEARCH_PATH.join(":"),
    LANG: "C.UTF-8",
    HOME: workDir,
    ...extra,
  };
  // Typed as a plain record: Next narrows `ProcessEnv` for its own process.
  return variables as NodeJS.ProcessEnv;
}

async function buildCommand(
  executable: string,
  request: ProcessRequest,
  workDir: string,
): Promise<{ file: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv } | null> {
  const extra = request.env ?? {};
  const bwrap = await findIsolation();

  if (bwrap) {
    const isolated = isolatedCommand(bwrap, {
      executable,
      args: request.args,
      workDir,
      readOnlyPaths: request.readOnlyPaths ?? [],
      env: {
        PATH: SEARCH_PATH.join(":"),
        LANG: "C.UTF-8",
        HOME: SANDBOX_WORK_DIR,
        ...extra,
      },
    });
    return {
      ...withResourceLimits(isolated, request.limits),
      cwd: workDir,
      env: {} as NodeJS.ProcessEnv,
    };
  }

  const mayRunUnisolated =
    request.isolation === "preferred" || env.SANDBOX_ISOLATION === "disabled";
  if (!mayRunUnisolated) return null;
  return {
    ...withResourceLimits({ file: executable, args: [...request.args] }, request.limits),
    cwd: workDir,
    env: plainEnvironment(workDir, extra),
  };
}

export async function runProcess(request: ProcessRequest): Promise<ProcessResult> {
  const startedAt = performance.now();
  const executable = resolveExecutable(request.command);
  if (executable === null) return failed("not-found");
  if (request.signal?.aborted) return failed("aborted");

  const workDir = await mkdtemp(path.join(tmpdir(), "texflow-job-"));
  try {
    const command = await buildCommand(executable, request, workDir);
    if (command === null) return failed("isolation-unavailable");
    await writeJobFiles(workDir, request.files ?? []);

    const run = await new Promise<Omit<ProcessResult, "outputs" | "durationMs">>(
      (resolve) => {
        let failure: ProcessFailure | undefined;
        const child = spawn(/* turbopackIgnore: true */ command.file, command.args, {
          cwd: command.cwd,
          shell: false,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"],
          env: command.env,
        });

        const kill = (reason: ProcessFailure) => {
          failure ??= reason;
          child.kill("SIGKILL");
        };
        const onAbort = () => kill("aborted");
        request.signal?.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(() => kill("timeout"), request.limits.timeoutMs);
        const stdout = createCollector(request.limits.maxOutputBytes, () =>
          kill("output-limit"),
        );
        const stderr = createCollector(request.limits.maxOutputBytes, () =>
          kill("output-limit"),
        );

        const finish = (exitCode: number | null) => {
          clearTimeout(timer);
          request.signal?.removeEventListener("abort", onAbort);
          resolve({
            stdout: stdout.text(),
            stderr: stderr.text(),
            exitCode: failure ? null : exitCode,
            ...(failure ? { failure } : {}),
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
      },
    );

    const outputs = run.failure
      ? NO_OUTPUTS
      : await collectOutputs(workDir, request.collect ?? [], request.limits.maxFileBytes);
    return { ...run, outputs, durationMs: Math.round(performance.now() - startedAt) };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
