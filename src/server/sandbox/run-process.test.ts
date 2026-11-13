// @vitest-environment node
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { runProcess, type ProcessLimits } from "./run-process";
import { createSemaphore } from "./semaphore";

const limits: ProcessLimits = {
  timeoutMs: 5000,
  cpuSeconds: 5,
  maxFileBytes: 1024 * 1024,
  maxOutputBytes: 64 * 1024,
};

describe("runProcess", () => {
  it("passes stdin through and captures stdout", async () => {
    const result = await runProcess({
      command: "cat",
      args: [],
      stdin: "hola\n",
      limits,
      isolation: "preferred",
    });
    expect(result).toMatchObject({ stdout: "hola\n", exitCode: 0 });
    expect(result.failure).toBeUndefined();
  });

  it("reports the exit code and stderr of a failing program", async () => {
    const result = await runProcess({
      command: "ls",
      args: ["/no/such/dir"],
      limits,
      isolation: "preferred",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No such file");
  });

  it("never interprets arguments as shell syntax", async () => {
    const marker = "/tmp/texflow-injection-marker";
    const result = await runProcess({
      command: "echo",
      args: [`; touch ${marker}`, "$(id)", "`id`", "&& false"],
      limits,
      isolation: "preferred",
    });
    expect(result.stdout.trim()).toBe(`; touch ${marker} $(id) \`id\` && false`);
    expect(existsSync(marker)).toBe(false);
  });

  it("kills a process that runs past the time limit", async () => {
    const result = await runProcess({
      command: "sleep",
      args: ["30"],
      limits: { ...limits, timeoutMs: 150 },
      isolation: "preferred",
    });
    expect(result).toMatchObject({ failure: "timeout", exitCode: null });
    expect(result.durationMs).toBeLessThan(2000);
  });

  it("kills a process that produces too much output", async () => {
    const result = await runProcess({
      command: "yes",
      args: [],
      limits: { ...limits, maxOutputBytes: 4096 },
      isolation: "preferred",
    });
    expect(result.failure).toBe("output-limit");
    expect(result.stdout.length).toBeLessThanOrEqual(4096);
  });

  it("reports a missing executable instead of throwing", async () => {
    const result = await runProcess({
      command: "texflow-no-such-binary",
      args: [],
      limits,
      isolation: "preferred",
    });
    expect(result).toMatchObject({ failure: "not-found", exitCode: null });
  });

  it("runs in an empty private directory and does not leak the server environment", async () => {
    process.env.TEXFLOW_TEST_SECRET = "s3cret";
    const cwd = await runProcess({
      command: "pwd",
      args: [],
      limits,
      isolation: "preferred",
    });
    const env = await runProcess({
      command: "env",
      args: [],
      limits,
      isolation: "preferred",
    });
    const files = await runProcess({
      command: "ls",
      args: ["-A"],
      limits,
      isolation: "preferred",
    });
    delete process.env.TEXFLOW_TEST_SECRET;

    // Isolated, the job only knows its directory as /work.
    expect(cwd.stdout.trim()).toBe("/work");
    expect(env.stdout).not.toContain("s3cret");
    expect(files.stdout).toBe("");
  });
});

describe("isolation", () => {
  const isolated = { limits, isolation: "required" } as const;

  it("hides the host's files from the job", async () => {
    const passwd = await runProcess({
      command: "cat",
      args: ["/etc/passwd"],
      ...isolated,
    });
    expect(passwd.exitCode).not.toBe(0);
    expect(passwd.stdout).toBe("");

    const root = await runProcess({ command: "ls", args: ["/"], ...isolated });
    expect(root.stdout.split("\n").filter(Boolean).sort()).toEqual(
      expect.not.arrayContaining(["etc", "home", "root", "var"]),
    );
    expect(root.stdout).toContain("work");
  });

  it("hides the application and the server's processes", async () => {
    const app = await runProcess({ command: "ls", args: [process.cwd()], ...isolated });
    expect(app.exitCode).not.toBe(0);

    // Not even /proc: it would describe the host and its mounts.
    const processes = await runProcess({ command: "ls", args: ["/proc"], ...isolated });
    expect(processes.exitCode).not.toBe(0);
  });

  it("gives the job no network", async () => {
    const result = await runProcess({
      command: "ls",
      args: ["/sys/class/net"],
      ...isolated,
    });
    expect(result.stdout.trim()).toBe("");
  });

  it("exposes only the extra paths it is given, read-only", async () => {
    const cwd = process.cwd();
    const read = await runProcess({
      command: "cat",
      args: [`${cwd}/pandoc/README.md`],
      readOnlyPaths: [`${cwd}/pandoc`],
      ...isolated,
    });
    expect(read.stdout).toContain("Pandoc");

    const write = await runProcess({
      command: "touch",
      args: [`${cwd}/pandoc/escrito`],
      readOnlyPaths: [`${cwd}/pandoc`],
      ...isolated,
    });
    expect(write.exitCode).not.toBe(0);
    expect(existsSync(`${cwd}/pandoc/escrito`)).toBe(false);
  });
});

describe("job files", () => {
  it("places input files in the working directory and reads outputs back", async () => {
    const result = await runProcess({
      command: "cp",
      args: ["entrada.txt", "salida.txt"],
      files: [{ name: "entrada.txt", data: "contenido" }],
      collect: ["salida.txt", "no-existe.txt"],
      limits,
      isolation: "required",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs.get("salida.txt")?.toString()).toBe("contenido");
    expect(result.outputs.has("no-existe.txt")).toBe(false);
  });

  it("rejects file names that could leave the working directory", async () => {
    await expect(
      runProcess({
        command: "true",
        args: [],
        files: [{ name: "../fuera.txt", data: "x" }],
        limits,
        isolation: "preferred",
      }),
    ).rejects.toThrow("Unsafe job file name");
  });

  it("does not follow a symlink the job leaves under an expected name", async () => {
    const result = await runProcess({
      command: "ln",
      args: ["-s", "/etc/passwd", "salida.pdf"],
      collect: ["salida.pdf"],
      limits,
      isolation: "preferred",
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs.has("salida.pdf")).toBe(false);
  });

  it("stops a job from writing a file larger than the limit", async () => {
    const copy = (maxFileBytes: number) =>
      runProcess({
        command: "cp",
        args: ["grande.bin", "copia.bin"],
        files: [{ name: "grande.bin", data: new Uint8Array(2048) }],
        collect: ["copia.bin"],
        limits: { ...limits, maxFileBytes },
        isolation: "preferred",
      });

    const roomy = await copy(4096);
    expect(roomy.exitCode).toBe(0);
    expect(roomy.outputs.get("copia.bin")?.length).toBe(2048);

    // The kernel cuts the write short, so the copy fails and nothing oversized exists.
    const tight = await copy(1024);
    expect(tight.exitCode).not.toBe(0);
    expect(tight.outputs.get("copia.bin")?.length ?? 0).toBeLessThanOrEqual(1024);
  });

  it("kills the process when the caller aborts", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const result = await runProcess({
      command: "sleep",
      args: ["30"],
      signal: controller.signal,
      limits,
      isolation: "preferred",
    });
    expect(result).toMatchObject({ failure: "aborted", exitCode: null });
    expect(result.durationMs).toBeLessThan(3000);
  });
});

describe("semaphore", () => {
  it("runs at most the configured number of jobs at once", async () => {
    const semaphore = createSemaphore(2);
    let running = 0;
    let peak = 0;
    const job = async () => {
      peak = Math.max(peak, ++running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running--;
      return "done";
    };
    const results = await Promise.all(
      Array.from({ length: 6 }, () => semaphore.run(job, 1000)),
    );
    expect(peak).toBe(2);
    expect(results).toEqual(Array(6).fill("done"));
  });

  it("gives up when no slot frees in time, and recovers afterwards", async () => {
    const semaphore = createSemaphore(1);
    const slow = semaphore.run(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
      1000,
    );
    expect(await semaphore.run(async () => "never", 10)).toBeNull();
    await slow;
    expect(await semaphore.run(async () => "ok", 10)).toBe("ok");
  });

  it("frees the slot when a job throws", async () => {
    const semaphore = createSemaphore(1);
    await expect(
      semaphore.run(async () => {
        throw new Error("boom");
      }, 10),
    ).rejects.toThrow("boom");
    expect(await semaphore.run(async () => "ok", 10)).toBe("ok");
  });
});
