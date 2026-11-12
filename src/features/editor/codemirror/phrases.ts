import { EditorState } from "@codemirror/state";

/** Spanish text for CodeMirror's own interface (search panel, screen reader notes). */
export const spanishPhrases = EditorState.phrases.of({
  Find: "Buscar",
  Replace: "Reemplazar",
  next: "Siguiente",
  previous: "Anterior",
  all: "Todas",
  "match case": "Distinguir mayúsculas",
  regexp: "Expresión regular",
  "by word": "Palabra completa",
  replace: "Reemplazar",
  "replace all": "Reemplazar todas",
  close: "cerrar",
  "current match": "coincidencia actual",
  "replaced $ matches": "$ coincidencias reemplazadas",
  "replaced match on line $": "coincidencia reemplazada en la línea $",
  "on line": "en la línea",
  "Go to line": "Ir a la línea",
  go: "ir",
  Completions: "Sugerencias",
});
