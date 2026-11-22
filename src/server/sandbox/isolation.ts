import "server-only";

import { spawn } from "node:child_process";
import { existsSync, lstatSync, readlinkSync } from "node:fs";

/**
 * OS-level isolation with bubblewrap.
 *
 * Inside the sandbox a job sees a read-only /usr, an empty /tmp, its own job directory
 * mounted at /work and nothing else: no /etc, no /home, no /proc, no application files,
 * no other processes and no network. Resource limits and the absence of a shell cannot stop a
 * LaTeX document from reading files; this can.
 */

const BWRAP_CANDIDATES = ["/usr/bin/bwrap", "/usr/local/bin/bwrap", "/bin/bwrap"];

/** Where the job directory appears inside the sandbox. */
export const SANDBOX_WORK_DIR = "/work";

/**
 * Mount arguments for the system directories. On merged-/usr systems /lib and /bin are
 * symlinks into /usr and are recreated as such; elsewhere they are bound read-only.
 */
function systemMounts(): string[] {
  const mounts = ["--ro-bind", "/usr", "/usr"];
  for (const directory of ["/lib", "/lib64", "/bin", "/sbin"]) {
    // System directories, not project files: nothing here belongs in the bundle trace.
    if (!existsSync(/* turbopackIgnore: true */ directory)) continue;
    if (lstatSync(/* turbopackIgnore: true */ directory).isSymbolicLink()) {
      mounts.push(
        "--symlink",
        readlinkSync(/* turbopackIgnore: true */ directory),
        directory,
      );
    } else {
      mounts.push("--ro-bind", directory, directory);
    }
  }
  // Font configuration, so the engine can resolve fonts by name. Holds no secrets.
  mounts.push("--ro-bind-try", "/etc/fonts", "/etc/fonts");
  return mounts;
}

export interface IsolationRequest {
  readonly executable: string;
  readonly args: readonly string[];
  /** Host directory mounted read-write at /work, the job's working directory. */
  readonly workDir: string;
  /** Host paths visible read-only inside, at the same location. */
  readonly readOnlyPaths: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

/** The bubblewrap invocation that runs a command inside the sandbox. */
export function isolatedCommand(
  bwrap: string,
  request: IsolationRequest,
): { file: string; args: string[] } {
  return {
    file: bwrap,
    args: [
      "--unshare-all",
      "--die-with-parent",
      "--new-session",
      "--clearenv",
      ...systemMounts(),
      "--dev",
      "/dev",
      "--tmpfs",
      "/tmp",
      ...request.readOnlyPaths.flatMap((path) => ["--ro-bind", path, path]),
      "--bind",
      request.workDir,
      SANDBOX_WORK_DIR,
      "--chdir",
      SANDBOX_WORK_DIR,
      ...Object.entries(request.env).flatMap(([name, value]) => [
        "--setenv",
        name,
        value,
      ]),
      "--",
      request.executable,
      ...request.args,
    ],
  };
}

/** Runs a trivial command in the sandbox to learn whether this host allows it. */
function probe(bwrap: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { file, args } = isolatedCommand(bwrap, {
      executable: "/usr/bin/true",
      args: [],
      workDir: "/tmp",
      readOnlyPaths: [],
      env: {},
    });
    const child = spawn(/* turbopackIgnore: true */ file, args, { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

let available: Promise<string | null> | undefined;

/**
 * The bubblewrap executable if this host can isolate processes, otherwise null. Some
 * hosts have the program but forbid the namespaces it needs, so it is tried once.
 */
export function findIsolation(): Promise<string | null> {
  available ??= (async () => {
    const bwrap = BWRAP_CANDIDATES.find((candidate) => existsSync(candidate));
    if (!bwrap) return null;
    return (await probe(bwrap)) ? bwrap : null;
  })();
  return available;
}
