import NextAuth from "next-auth";
import type { NextProxy } from "next/server";

import { authConfig } from "@/server/auth/config";

const { auth } = NextAuth(authConfig);

// Called with a request, `auth` runs the `authorized` callback of the config. Its
// types predate the rename from middleware to proxy.
const authorize = auth as unknown as NextProxy;

/**
 * Sends signed-out visitors of the documents to the sign-in page, and signed-in ones
 * away from it. An optimistic check on the session token alone: the pages and API
 * routes verify the session themselves before touching any data.
 */
export const proxy: NextProxy = (request, event) => authorize(request, event);

export const config = {
  matcher: ["/documents/:path*", "/login", "/signup"],
};
