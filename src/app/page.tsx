import { cookies } from "next/headers";
import { Suspense } from "react";

import { Workspace } from "@/features/workspace/components/workspace";
import { WorkspaceSkeleton } from "@/features/workspace/components/workspace-skeleton";
import { LAYOUT_COOKIE, parseLayout } from "@/features/workspace/model/layout-cookie";

async function SavedWorkspace() {
  const cookieStore = await cookies();
  const layout = parseLayout(cookieStore.get(LAYOUT_COOKIE)?.value);
  return <Workspace initialLayout={layout} />;
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <SavedWorkspace />
    </Suspense>
  );
}
