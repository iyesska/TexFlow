import "server-only";

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with scrypt, from Node's own crypto: memory-hard, no native module.
 * Stored as "scrypt$N$r$p$salt$hash" so the cost can be raised later and old hashes
 * still verify.
 */

const COST: Required<Pick<ScryptOptions, "N" | "r" | "p">> = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** scrypt needs 128 × N × r bytes; leave headroom over Node's 32 MB default. */
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, cost: typeof COST): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { ...cost, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST);
  return [
    "scrypt",
    COST.N,
    COST.r,
    COST.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash of a random password, checked when no user matches, so timing does not tell. */
let decoy: Promise<string> | undefined;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(16).toString("hex"));
  return decoy;
}
