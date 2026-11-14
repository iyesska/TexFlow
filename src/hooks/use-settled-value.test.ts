import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSettledValue } from "./use-settled-value";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSettledValue", () => {
  it("follows the value only once it stops changing", () => {
    const { result, rerender } = renderHook(({ value }) => useSettledValue(value, 1000), {
      initialProps: { value: "@" },
    });
    expect(result.current).toBe("@");

    rerender({ value: "@pe" });
    act(() => vi.advanceTimersByTime(600));
    rerender({ value: "@perez" });
    act(() => vi.advanceTimersByTime(600));
    // Still typing: the last settled value stays.
    expect(result.current).toBe("@");

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe("@perez");
  });
});
