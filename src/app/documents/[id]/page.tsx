import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { idSchema } from "@/contracts/documents";
import { Workspace } from "@/features/workspace/components/workspace";
import { WorkspaceSkeleton } from "@/features/workspace/components/workspace-skeleton";
import { LAYOUT_COOKIE, parseLayout } from "@/features/workspace/model/layout-cookie";
import { listAssets } from "@/server/assets/assets";
import { requireSessionUser } from "@/server/auth/session";
import { getDocument } from "@/server/documents/documents";
import { documentDto } from "@/server/documents/dto";

type Props = PageProps<"/documents/[id]">;

/** The signed-in user's document with its images, or null. Once per request. */
const openDocument = cache(async (rawId: string) => {
  const user = await requireSessionUser();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return null;
  const [document, assets] = await Promise.all([
    getDocument(user.id, id.data),
    listAssets(user.id, id.data),
  ]);
  if (!document) return null;
  return { user, document: documentDto(document), assets: assets ?? [] };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const opened = await openDocument((await params).id);
  return { title: opened?.document.title ?? "Documento" };
}

async function OpenWorkspace({ params }: Pick<Props, "params">) {
  const [{ id }, cookieStore] = await Promise.all([params, cookies()]);
  const opened = await openDocument(id);
  if (!opened) notFound();
  return (
    <Workspace
      // A new editing session when the document changed since this page last showed
      // it: elsewhere, or by this session's own saves. Otherwise going back to it
      // finds the editor as it was left.
      key={`${opened.document.id}:${opened.document.updatedAt}`}
      document={opened.document}
      assets={opened.assets}
      user={{ id: opened.user.id, name: opened.user.name, email: opened.user.email }}
      initialLayout={parseLayout(cookieStore.get(LAYOUT_COOKIE)?.value)}
    />
  );
}

export default function DocumentPage({ params }: Props) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <OpenWorkspace params={params} />
    </Suspense>
  );
}
