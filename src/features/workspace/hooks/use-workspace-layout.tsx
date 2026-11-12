"use client";

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { layoutReducer, type LayoutAction, type WorkspaceLayout } from "../model/layout";
import { layoutCookieString } from "../model/layout-cookie";

interface WorkspaceLayoutContextValue {
  readonly layout: WorkspaceLayout;
  readonly dispatch: Dispatch<LayoutAction>;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null);

function persistLayout(layout: WorkspaceLayout): void {
  document.cookie = layoutCookieString(layout);
}

export function WorkspaceLayoutProvider({
  initialLayout,
  children,
}: {
  initialLayout: WorkspaceLayout;
  children: ReactNode;
}) {
  const [layout, dispatch] = useReducer(layoutReducer, initialLayout);

  useEffect(() => {
    persistLayout(layout);
  }, [layout]);

  const value = useMemo(() => ({ layout, dispatch }), [layout]);

  return <WorkspaceLayoutContext value={value}>{children}</WorkspaceLayoutContext>;
}

export function useWorkspaceLayout(): WorkspaceLayoutContextValue {
  const value = use(WorkspaceLayoutContext);
  if (!value) {
    throw new Error("useWorkspaceLayout must be used inside <WorkspaceLayoutProvider>.");
  }
  return value;
}
