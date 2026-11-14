import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { db } from "@/server/db/client";

import { auth } from "./index";

/**
 * The data access layer's view of who is asking. Everything that reads or changes a
 * user's work starts here, and passes only the id on.
 */
export interface SessionUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

/**
 * The signed-in user. The session token names them; the database confirms they still
 * exist, so a deleted account's token opens nothing. Once per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Reading the session is request-time work: Auth.js also draws random values (a
  // CSRF token) while doing it, which Next.js only allows once rendering is dynamic.
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db().user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
});

/** For pages: the signed-in user, or a redirect to the sign-in page. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
