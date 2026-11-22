/**
 * Documents in use: not in the trash. Every query that serves, changes or counts a
 * document the writer works with adds it; only the trash itself looks past it.
 */
export const LIVE = { deletedAt: null } as const;
