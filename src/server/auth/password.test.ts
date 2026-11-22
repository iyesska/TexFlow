// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correcto caballo batería grapa");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword("correcto caballo batería grapa", hash)).toBe(true);
    expect(await verifyPassword("incorrecto", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("misma")).not.toBe(await hashPassword("misma"));
  });

  it("treats equivalent Unicode spellings of a password as the same", async () => {
    const composed = "contraseña";
    const decomposed = "contraseña";
    expect(await verifyPassword(decomposed, await hashPassword(composed))).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$10$abc")).toBe(false);
  });
});
