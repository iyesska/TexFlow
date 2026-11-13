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
    });
    expect(result).toMatchObject({ stdout: "hola\n", exitCode: 0 });
    expect(result.failure).toBeUndefined();
  });

  it("reports the exit code and stderr of a failing program", async () => {
    const result = await runProcess({ command: "ls", args: ["/no/such/dir"], limits });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No such file");
  });

  it("never interprets arguments as shell syntax", async () => {
    const marker = "/tmp/texflow-injection-marker";
    const result = await runProcess({
      command: "echo",
      args: [`; touch ${marker}`, "$(id)", "`id`", "&& false"],
      limits,
    });
    expect(result.stdout.trim()).toBe(`; touch ${marker} $(id) \`id\` && false`);
    expect(existsSync(marker)).toBe(false);
  });

  it("kills a process that runs past the time limit", async () => {
    const result = await runProcess({
      command: "sleep",
      args: ["30"],
      limits: { ...limits, timeoutMs: 150 },
    });
    expect(result).toMatchObject({ failure: "timeout", exitCode: null });
    expect(result.durationMs).toBeLessThan(2000);
  });

  it("kills a process that produces too much output", async () => {
    const result = await runProcess({
      command: "yes",
      args: [],
      limits: { ...limits, maxOutputBytes: 4096 },
    });
    expect(result.failure).toBe("output-limit");
    expect(result.stdout.length).toBeLessThanOrEqual(4096);
  });

  it("reports a missing executable instead of throwing", async () => {
    const result = await runProcess({
      command: "texflow-no-such-binary",
      args: [],
      limits,
    });
    expect(result).toMatchObject({ failure: "not-found", exitCode: null });
  });

  it("runs in an empty private directory and does not leak the server environment", async () => {
    process.env.TEXFLOW_TEST_SECRET = "s3cret";
    const cwd = await runProcess({ command: "pwd", args: [], limits });
    const env = await runProcess({ command: "env", args: [], limits });
    const files = await runProcess({ command: "ls", args: ["-A"], limits });
    delete process.env.TEXFLOW_TEST_SECRET;

    expect(cwd.stdout).toContain("texflow-job-");
    expect(existsSync(cwd.stdout.trim())).toBe(false);
    expect(env.stdout).not.toContain("s3cret");
    expect(files.stdout).toBe("");
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
