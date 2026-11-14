/** What the browser knows about the signed-in user: enough to show who they are. */
export interface AccountUser {
  /** Keys what this browser keeps for the account, such as the first-steps guide. */
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

/** One or two letters for the avatar: from the name, else from the email address. */
export function initials(user: Pick<AccountUser, "name" | "email">): string {
  const words = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]![0]}${words[words.length - 1]![0]}`
      : (words[0]?.[0] ?? user.email?.[0] ?? "?");
  return letters.toLocaleUpperCase("es");
}
