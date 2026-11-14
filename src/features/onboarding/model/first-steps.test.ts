import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFirstStepsStore,
  isComplete,
  NO_PROGRESS,
  readProgress,
  withStep,
  FIRST_STEPS,
} from "./first-steps";

beforeEach(() => window.localStorage.clear());

describe("withStep", () => {
  it("adds a step once, keeping the guide's order", () => {
    const progress = withStep(withStep(NO_PROGRESS, "pdf"), "write");
    expect(progress.done).toEqual(["write", "pdf"]);
    expect(withStep(progress, "pdf")).toBe(progress);
  });

  it("is complete once every step is done", () => {
    const all = FIRST_STEPS.reduce(withStep, NO_PROGRESS);
    expect(isComplete(all)).toBe(true);
    expect(isComplete(withStep(NO_PROGRESS, "write"))).toBe(false);
  });
});

describe("readProgress", () => {
  it("ignores what it does not recognise", () => {
    window.localStorage.setItem("texflow:first-steps:u1", '{"done":["volar"]}');
    expect(readProgress(window.localStorage, "u1")).toEqual(NO_PROGRESS);
    window.localStorage.setItem("texflow:first-steps:u1", "{no es json");
    expect(readProgress(window.localStorage, "u1")).toEqual(NO_PROGRESS);
    expect(readProgress(null, "u1")).toEqual(NO_PROGRESS);
  });
});

describe("createFirstStepsStore", () => {
  it("keeps each account's progress, and tells subscribers about changes", () => {
    const store = createFirstStepsStore(window.localStorage, "u1");
    const listener = vi.fn();
    store.subscribe(listener);

    store.complete("write");
    store.complete("write");
    store.dismiss();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual({ done: ["write"], dismissed: true });

    expect(createFirstStepsStore(window.localStorage, "u1").getSnapshot()).toEqual({
      done: ["write"],
      dismissed: true,
    });
    expect(createFirstStepsStore(window.localStorage, "u2").getSnapshot()).toEqual(
      NO_PROGRESS,
    );

    store.show();
    expect(store.getSnapshot().dismissed).toBe(false);
  });

  it("works without storage", () => {
    const store = createFirstStepsStore(null, "u1");
    store.complete("cite");
    expect(store.getSnapshot().done).toEqual(["cite"]);
  });
});
