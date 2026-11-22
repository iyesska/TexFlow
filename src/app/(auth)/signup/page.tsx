import type { Metadata } from "next";
import { Suspense } from "react";

import { SignUpForm } from "@/features/account/components/account-forms";
import { AccountHeading } from "@/features/account/components/account-heading";
import { offersGitHub } from "@/server/auth";

export const metadata: Metadata = { title: "Crear una cuenta" };

export default function SignUpPage() {
  return (
    <>
      <AccountHeading
        title="Crea tu cuenta"
        description="Escribe en Markdown y obtén LaTeX y PDF listos para entregar. Tu primer documento te enseña lo esencial."
      />
      <Suspense>
        <SignUpForm offersGitHub={offersGitHub} />
      </Suspense>
    </>
  );
}
