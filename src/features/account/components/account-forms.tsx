"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { GitHubMark } from "@/components/brand/github-mark";
import { Button } from "@/components/ui/button";
import { PASSWORD_LIMITS } from "@/contracts/account";
import {
  signInWithGitHub,
  signInWithPassword,
  signUpWithPassword,
  type AccountFormState,
} from "@/actions/account";

import { Field, PasswordField } from "./field";

const INITIAL: AccountFormState = {};

/** Where to go once signed in, as the proxy or a link asked. The server checks it. */
function useNextPath(): string {
  const params = useSearchParams();
  return params.get("next") ?? params.get("callbackUrl") ?? "";
}

function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-ui text-destructive"
    >
      {message}
    </p>
  );
}

function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}

function GitHubOption({ next }: { next: string }) {
  return (
    <>
      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <GitHubMark className="size-4" />
          Continuar con GitHub
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o con tu correo
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

function EmailField({ state }: { state: AccountFormState }) {
  return (
    <Field
      label="Correo electrónico"
      name="email"
      type="email"
      autoComplete="email"
      inputMode="email"
      required
      defaultValue={state.values?.email}
      error={state.fieldErrors?.email}
    />
  );
}

/** The way to the other form: from signing in to signing up, and back. */
function OtherPage({
  question,
  href,
  label,
}: {
  question: string;
  href: "/login" | "/signup";
  label: string;
}) {
  return (
    <p className="text-ui text-muted-foreground">
      {question}{" "}
      <Link
        href={href}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}

export function SignInForm({ offersGitHub }: { offersGitHub: boolean }) {
  const [state, action, pending] = useActionState(signInWithPassword, INITIAL);
  const next = useNextPath();
  return (
    <div className="grid gap-5">
      {offersGitHub ? <GitHubOption next={next} /> : null}
      <form action={action} noValidate className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <EmailField state={state} />
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <FormError message={state.error} />
        <SubmitButton pending={pending} label="Iniciar sesión" pendingLabel="Entrando…" />
      </form>
      <OtherPage question="¿Aún no tienes cuenta?" href="/signup" label="Crea una" />
    </div>
  );
}

export function SignUpForm({ offersGitHub }: { offersGitHub: boolean }) {
  const [state, action, pending] = useActionState(signUpWithPassword, INITIAL);
  return (
    <div className="grid gap-5">
      {offersGitHub ? <GitHubOption next="" /> : null}
      <form action={action} noValidate className="grid gap-4">
        <Field
          label="Nombre"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
        />
        <EmailField state={state} />
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_LIMITS.min}
          hint={`Al menos ${PASSWORD_LIMITS.min} caracteres.`}
          error={state.fieldErrors?.password}
        />
        <FormError message={state.error} />
        <SubmitButton
          pending={pending}
          label="Crear cuenta"
          pendingLabel="Creando la cuenta…"
        />
      </form>
      <OtherPage question="¿Ya tienes cuenta?" href="/login" label="Inicia sesión" />
    </div>
  );
}
