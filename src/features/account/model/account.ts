/** What the browser knows about the signed-in user: enough to show who they are. */
export interface AccountUser {
  readonly name: string | null;
  readonly email: string | null;
}

/** One or two letters for the avatar: from the name, else from the email address. */
export function initials(user: AccountUser): string {
  const words = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]![0]}${words[words.length - 1]![0]}`
      : (words[0]?.[0] ?? user.email?.[0] ?? "?");
  return letters.toLocaleUpperCase("es");
}
