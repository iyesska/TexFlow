import "server-only";

import type { SignInInput, SignUpInput } from "@/contracts/account";
import { decoyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { db, Prisma } from "@/server/db/client";

/** What the rest of the server may know about a user. Never the password hash. */
export interface UserSummary {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

const SUMMARY = { id: true, name: true, email: true } as const;

export type SignUpResult =
  | { readonly ok: true; readonly user: UserSummary }
  | { readonly ok: false; readonly reason: "email-taken" };

export async function createUserWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db().user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: SUMMARY,
    });
    return { ok: true, user };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "email-taken" };
    }
    throw error;
  }
}

/**
 * The user with this email and password, or null. A wrong email costs as much time as
 * a wrong password, so the answer does not reveal which addresses have accounts.
 */
export async function findUserByCredentials(
  input: SignInInput,
): Promise<UserSummary | null> {
  const user = await db().user.findUnique({
    where: { email: input.email },
    select: { ...SUMMARY, passwordHash: true },
  });
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await decoyHash()),
  );
  if (!user || !user.passwordHash || !valid) return null;
  return { id: user.id, name: user.name, email: user.email };
}
