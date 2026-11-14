"use client";

import { FolderOpen, Plus, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { TemplateThumbnail } from "@/features/templates/components/template-thumbnail";
import { TEMPLATES, templateSettings } from "@/templates/catalog";
import type { TemplateId } from "@/templates/settings";

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-xl border bg-surface text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="mt-4 text-sm font-medium text-balance">{title}</h2>
      <p className="mt-1 max-w-[46ch] text-ui text-pretty text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** A first visit: no documents yet, so the templates are the way in. */
export function FirstDocument({
  onCreate,
}: {
  onCreate: (templateId: TemplateId) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-2 py-10">
      <h2 className="text-lg font-semibold text-balance">Aún no tienes documentos</h2>
      <p className="mt-1 max-w-[56ch] text-sm text-pretty text-muted-foreground">
        Elige cómo quieres que se vea el primero. La plantilla se puede cambiar en
        cualquier momento desde Diseño, y lo que escribas se guarda solo.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onCreate(template.id)}
              className="group flex h-full w-full flex-col items-center gap-3 rounded-xl border bg-surface p-4 text-center transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-surface-raised focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <TemplateThumbnail
                settings={templateSettings(template.id)}
                structure={template.structure}
                className="w-14"
              />
              <span className="text-ui font-medium">{template.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyFolder({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title="Esta carpeta está vacía"
      description="Crea un documento aquí, o trae uno con «Mover a» en el menú de cualquier documento."
      action={
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus />
          Nuevo documento
        </Button>
      }
    />
  );
}

export function NothingUnfiled() {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title="Todos tus documentos están en carpetas"
      description="Aquí aparecen los documentos que no están en ninguna carpeta."
    />
  );
}

export function NoMatches({
  query,
  onSearchEverywhere,
}: {
  query: string;
  /** Offered when the search is limited to one folder. */
  onSearchEverywhere?: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchX />}
      title={`Ningún título contiene «${query.trim()}»`}
      description="Prueba con otra palabra. La búsqueda no distingue mayúsculas ni tildes."
      action={
        onSearchEverywhere ? (
          <Button variant="outline" size="sm" onClick={onSearchEverywhere}>
            Buscar en todos los documentos
          </Button>
        ) : undefined
      }
    />
  );
}
