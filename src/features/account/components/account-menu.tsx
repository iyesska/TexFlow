"use client";

import { LogOut } from "lucide-react";
import { useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutOfAccount } from "@/actions/account";

import { initials, type AccountUser } from "../model/account";

export function Avatar({ user }: { user: AccountUser }) {
  return (
    <span
      aria-hidden
      className="grid size-7 place-items-center rounded-full bg-muted text-2xs font-semibold tracking-wide text-muted-foreground ring-1 ring-border-strong"
    >
      {initials(user)}
    </span>
  );
}

/**
 * Who is signed in, and the way out. `beforeSignOut` lets the editor save first;
 * `children` adds items of the page's own.
 */
export function AccountMenu({
  user,
  beforeSignOut,
  children,
}: {
  user: AccountUser;
  beforeSignOut?: () => Promise<void>;
  children?: ReactNode;
}) {
  const [signingOut, startSigningOut] = useTransition();

  const signOut = () =>
    startSigningOut(async () => {
      await beforeSignOut?.();
      await signOutOfAccount();
      // A full load, not a client navigation: the pages kept for going back hold this
      // user's documents, and the next person at this browser must not see them.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
      window.location.href = "/login";
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tu cuenta"
          className="rounded-full"
          disabled={signingOut}
        >
          <Avatar user={user} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="truncate text-ui font-medium text-foreground">
            {user.name ?? "Tu cuenta"}
          </span>
          {user.email ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
