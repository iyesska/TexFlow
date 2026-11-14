import { CredentialsSignin, type NextAuthConfig } from "next-auth";

/**
 * The part of the Auth.js configuration that needs no database: enough to read a
 * session token. The proxy uses only this; ./index.ts adds the adapter and providers.
 */

const PROTECTED = /^\/documents(?:\/|$)/;
const ACCOUNT_PAGES = new Set(["/login", "/signup"]);
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export const authConfig = {
  pages: { signIn: "/login" },
  // Sign-in with a password requires session tokens rather than database sessions.
  session: { strategy: "jwt", maxAge: THIRTY_DAYS },
  providers: [],
  logger: {
    // A wrong password is the visitor's mistake, not the server's: the form says so.
    error(error) {
      if (!(error instanceof CredentialsSignin)) console.error(error);
    },
  },
  callbacks: {
    /** The proxy's optimistic check. Pages and API routes check the session again. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (ACCOUNT_PAGES.has(pathname) && auth?.user) {
        return Response.redirect(new URL("/documents", request.nextUrl));
      }
      return PROTECTED.test(pathname) ? Boolean(auth?.user) : true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
