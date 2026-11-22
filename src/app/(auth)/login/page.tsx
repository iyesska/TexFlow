import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/features/account/components/account-forms";
import { AccountHeading } from "@/features/account/components/account-heading";
import { offersGitHub } from "@/server/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <>
      <AccountHeading
        title="Inicia sesión"
        description="Tus documentos te esperan donde los dejaste."
      />
      {/* The form reads where to go next from the address. */}
      <Suspense>
        <SignInForm offersGitHub={offersGitHub} />
      </Suspense>
    </>
  );
}
