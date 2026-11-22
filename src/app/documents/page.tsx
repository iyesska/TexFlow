import type { Metadata } from "next";
import { Suspense } from "react";

import { Library } from "@/features/library/components/library";
import { LibrarySkeleton } from "@/features/library/components/library-skeleton";
import { requireSessionUser } from "@/server/auth/session";
import { listDocuments } from "@/server/documents/documents";
import { countTrash } from "@/server/documents/trash";
import { summaryDto } from "@/server/documents/dto";
import { listFolders } from "@/server/folders/folders";

export const metadata: Metadata = { title: "Tus documentos" };

async function UserLibrary() {
  const user = await requireSessionUser();
  const [documents, folders, trashCount] = await Promise.all([
    listDocuments(user.id),
    listFolders(user.id),
    countTrash(user.id),
  ]);
  return (
    <Library
      user={{ id: user.id, name: user.name, email: user.email }}
      documents={documents.map(summaryDto)}
      folders={folders}
      trashCount={trashCount}
    />
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <UserLibrary />
    </Suspense>
  );
}
