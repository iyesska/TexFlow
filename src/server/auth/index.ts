import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { signInSchema } from "@/contracts/account";
import { env } from "@/config/env";
import { db } from "@/server/db/client";
import { createWelcomeDocument } from "@/server/documents/welcome";
import { createRateLimiter } from "@/server/security/rate-limit";
import { findUserByCredentials } from "@/server/users/users";

import { authConfig } from "./config";

/** Thrown when an address has had too many failed attempts; the form says so. */
export class TooManyAttempts extends CredentialsSignin {
  override code = "too_many_attempts";
}

/** Ten wrong passwords per address every fifteen minutes. */
const signInAttempts = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

const githubConfigured = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

/** Whether the sign-in page should offer GitHub. */
export const offersGitHub = githubConfigured;

// A function, so the database client is only created when a request needs it.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  // The adapter is typed against the default @prisma/client output; ours is generated
  // elsewhere with the same models (see prisma/schema.prisma).
  adapter: PrismaAdapter(db() as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        if (!signInAttempts.take(parsed.data.email)) throw new TooManyAttempts();
        const user = await findUserByCredentials(parsed.data);
        if (user) signInAttempts.reset(parsed.data.email);
        return user;
      },
    }),
    ...(githubConfigured ? [GitHub] : []),
  ],
  events: {
    // Accounts made through GitHub get the same first document as the others.
    async createUser({ user }) {
      if (user.id) await createWelcomeDocument(user.id, user.name ?? null);
    },
  },
}));
