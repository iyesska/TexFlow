"use server";

/**
 * Server Actions for signing in, signing up and signing out. With the API routes, the
 * only server code the browser may call: each one validates its input itself.
 */

import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";
import type { z } from "zod";

import { signInSchema, signUpSchema } from "@/contracts/account";
import { signIn, signOut } from "@/server/auth";
import { HOME_PATH, safeNextPath } from "@/server/auth/next-path";
import { createWelcomeDocument } from "@/server/documents/welcome";
import { createRateLimiter } from "@/server/security/rate-limit";
import { createUserWithPassword } from "@/server/users/users";

/** What a sign-in or sign-up form shows after a failed attempt. */
export interface AccountFormState {
  /** About the whole attempt: "wrong password", "try again later". */
  readonly error?: string;
  readonly fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
  /** What was typed, so the form keeps it. Never the password. */
  readonly values?: { readonly name?: string; readonly email?: string };
}

/** New accounts per connection per hour: enough for a household, not for a script. */
const signUps = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

function clientKey(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "local";
}

function fieldErrorsOf(error: z.ZodError): AccountFormState["fieldErrors"] {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

/** Signs in and goes on to `redirectTo`; a failure comes back as a message. */
async function signInOrExplain(
  credentials: { readonly email: string; readonly password: string },
  redirectTo: string,
): Promise<AccountFormState> {
  try {
    await signIn("credentials", { ...credentials, redirectTo });
  } catch (error) {
    const values = { email: credentials.email };
    if (error instanceof CredentialsSignin) {
      return {
        error:
          error.code === "too_many_attempts"
            ? "Demasiados intentos fallidos con este correo. Espera unos minutos y vuelve a probar."
            : "El correo o la contraseña no son correctos.",
        values,
      };
    }
    if (error instanceof AuthError) {
      return { error: "No se pudo iniciar sesión. Vuelve a intentarlo.", values };
    }
    // Signing in ends in a redirect, which Next.js throws: let it through.
    throw error;
  }
  return {};
}

export async function signInWithPassword(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const email = text(form.get("email"));
  const parsed = signInSchema.safeParse({ email, password: text(form.get("password")) });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsOf(parsed.error), values: { email } };
  return signInOrExplain(parsed.data, safeNextPath(form.get("next")));
}

export async function signUpWithPassword(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const values = { name: text(form.get("name")), email: text(form.get("email")) };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(form.get("password")),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  if (!signUps.take(clientKey(await headers()))) {
    return {
      error: "Se han creado demasiadas cuentas desde esta conexión. Inténtalo más tarde.",
      values,
    };
  }
  const created = await createUserWithPassword(parsed.data);
  if (!created.ok) {
    return {
      fieldErrors: {
        email: "Ya hay una cuenta con este correo. Inicia sesión con ella.",
      },
      values,
    };
  }
  await createWelcomeDocument(created.user.id, created.user.name);
  return signInOrExplain(parsed.data, HOME_PATH);
}

export async function signInWithGitHub(form: FormData): Promise<void> {
  await signIn("github", { redirectTo: safeNextPath(form.get("next")) });
}

/**
 * Ends the session. The browser then loads the sign-in page in full, which clears
 * everything the pages kept in memory (see AccountMenu).
 */
export async function signOutOfAccount(): Promise<void> {
  await signOut({ redirect: false });
}
