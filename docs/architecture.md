# Arquitectura

Este documento describe cómo está organizado TexFlow y por qué. Distingue lo que ya
existe de lo que está planificado.

## Capas

TexFlow es una sola aplicación Next.js con tres capas que no se mezclan.

| Capa     | Ubicación        | Responsabilidad                                                       | Estado |
| -------- | ---------------- | --------------------------------------------------------------------- | ------ |
| Rutas    | `src/app`        | Layouts, páginas y route handlers. Validan la entrada y delegan.      | Fase 1 |
| Features | `src/features/*` | UI de cada área, sus hooks y un modelo puro por feature.              | Fase 1 |
| Servidor | `src/server/*`   | Lógica de negocio sin React: conversión, compilación, sandbox, datos. | Fase 3 |

Reglas:

- Un componente no contiene lógica de negocio. La lógica vive en un `model/` puro, que se
  prueba sin React, o en `src/server`.
- El código de cliente nunca importa de `src/server`; habla con él por la API. ESLint lo
  impide (`no-restricted-imports` en `eslint.config.mjs`).
- Toda entrada externa (cuerpos de petición, cookies, variables de entorno) se valida con
  Zod antes de usarse.

## El shell del editor (fase 1)

El diseño de paneles es un modelo puro en `src/features/workspace/model/layout.ts`: un
estado (`WorkspaceLayout`) y un reductor (`layoutReducer`) con las acciones mostrar,
ocultar, mover, redimensionar y restablecer. Invariantes: siempre hay al menos un panel
visible y `visible` está en orden de pantalla.

El diseño se guarda en una cookie, no en `localStorage`, para que el servidor pinte los
paneles correctos en la primera respuesta. La página (`src/app/page.tsx`) lee la cookie
dentro de un límite `Suspense`: Next prerrenderiza el resto y transmite solo esa parte.
La cookie es entrada del usuario, así que `parseLayout` la valida y vuelve al diseño por
defecto ante cualquier valor inválido.

Los atajos se declaran en `src/config/shortcuts.ts` y se describen por tecla física, de
modo que funcionan igual en cualquier distribución de teclado.

## El documento y el editor (fase 2)

El documento abierto vive en una `DocumentSession`
(`src/features/document/model/document-session.ts`), un objeto sin React que guarda el
Markdown, programa el guardado automático tras una pausa al escribir y expone su estado
(`loading`, `saved`, `unsaved`, `saving`, `error`). React lo lee con
`useSyncExternalStore`, de modo que cada componente se suscribe solo a lo que muestra.

La sesión guarda a través de la interfaz `DocumentStore`. Hoy la implementa el
almacenamiento del navegador, validado con Zod al leer; en la fase 7 la implementará la
API sin cambios en el editor. Los paneles LaTeX y Vista previa leerán el Markdown de la
misma sesión.

El editor separa CodeMirror de React:

- `src/features/editor/codemirror` no importa React. Contiene la sintaxis de Pandoc
  (fórmulas y notas al pie sobre el analizador de Markdown), los comandos de formato, las
  sugerencias, los atajos y el tema. Los comandos son funciones puras sobre el estado del
  editor, así que se prueban sin navegador.
- `src/features/editor/components` monta la vista y dibuja la barra de herramientas y la
  de estado.
- Una caché de sesión conserva el estado del editor (texto, cursor, historial) mientras
  el panel está oculto y reenvía los eventos al componente que lo muestre en ese momento.

CodeMirror se carga con `next/dynamic` sin SSR: es la parte más pesada de la página y
solo funciona en el navegador.

## Conversión a LaTeX (fase 3)

```
Editor ──► DocumentSession ──► useLatexConversion (pausa de 350 ms, aborta la anterior)
                                      │
                                      ▼
POST /api/convert ──► readJsonBody (corta al exceder el tamaño)
                  ──► convertRequestSchema (Zod)
                  ──► convertMarkdownToLatex ──► semáforo ──► runProcess ──► pandoc
                                      │
   { ok, latex, warnings } o { ok: false, error } ◄──┘
```

- **Contrato compartido.** `src/contracts/convert.ts` define con Zod la petición y la
  respuesta. La ruta valida la entrada con él y el cliente valida la respuesta, así que
  ninguno de los dos confía en el otro.
- **Ruta delgada.** `src/app/api/convert/route.ts` solo lee, valida, delega y traduce el
  código de error a un estado HTTP.
- **Servicio.** `src/server/conversion/convert-markdown.ts` construye los argumentos de
  Pandoc, interpreta sus fallos y devuelve mensajes listos para mostrar.
- **Cliente.** `useLatexConversion` convierte tras cada pausa, aborta la petición anterior
  y marca el resultado como pendiente hasta que el servidor responde para el texto actual.
  Mientras está pendiente no se puede copiar ni descargar: nunca se entrega código viejo.
- **Visor.** El panel aplica solo el cambio mínimo entre el LaTeX anterior y el nuevo, de
  modo que el desplazamiento y la selección no saltan al escribir.

## Vista previa (fase 4)

```
POST /api/preview ──► pandoc (HTML, filtro strip-raw, plantilla de título)
        │
        ▼  HTML no confiable
sanitizePreviewHtml (DOMPurify) ──► typesetMath (KaTeX) ──► resolveImages ──► patchChildren
```

- **Servidor.** `render-preview.ts` usa el mismo `runPandoc` que la conversión a LaTeX,
  con otra lista de opciones. Un filtro Lua propio (`pandoc/filters/strip-raw.lua`)
  elimina el HTML y el TeX en bruto, y una plantilla propia añade el bloque de título.
  Ambos son archivos nuestros, de confianza; el contenido del usuario nunca forma una
  ruta.
- **Frontera de confianza.** El HTML que devuelve el servidor todavía contiene lo que
  eligió el autor: destinos de enlaces, atributos, estilos. `sanitize.ts` lo pasa por
  DOMPurify con una lista cerrada de etiquetas y atributos, solo admite `http`, `https`,
  `mailto` y rutas relativas, reduce los estilos a alineación y anchos, y descarta los
  `id` que no llevan el prefijo de la vista previa. Se sanea en el cliente, con el
  analizador del propio navegador y justo antes de insertar.
- **Fórmulas.** Pandoc deja el TeX como texto; KaTeX lo compone en el navegador con
  `trust: false` y límites de expansión y tamaño, y entrega nodos del DOM, no una cadena
  HTML: en ningún momento se interpreta como HTML un texto del documento. Así el coste de componer recae en
  quien escribe el documento, no en el servidor, y las fórmulas ya compuestas se
  recuerdan.
- **Imágenes.** Solo se muestran las del propio documento, resueltas por nombre desde la
  biblioteca de imágenes. Las remotas se sustituyen por una nota y nunca se piden.
- **Actualización mínima.** `patchChildren` conserva los bloques que no cambian, de modo
  que escribir en un párrafo no recarga imágenes ni recompone fórmulas del resto.

### Imágenes del documento

`src/features/assets` sigue el mismo esquema que el documento: una interfaz `AssetStore`
(hoy IndexedDB, la API en la fase 7) y una `AssetLibrary` sin React que carga las
imágenes una vez y las mantiene en memoria. Al añadir una imagen se comprueba su tamaño,
se identifica su tipo por los primeros bytes del archivo (no por la extensión ni por el
tipo declarado) y se le da un nombre seguro y único. Solo se admiten PNG y JPEG, los
formatos que LaTeX puede incluir.

La compilación (fase 5) seguirá el patrón de las conversiones: contrato, ruta delgada,
servicio y `runProcess`.

## Modelo de seguridad

Pandoc y LaTeX procesan contenido no confiable. Todo proceso externo pasa por
`runProcess` (`src/server/sandbox/run-process.ts`).

En vigor desde la fase 3:

- **Sin shell.** `spawn` recibe el ejecutable y los argumentos como lista. Lo que escribe
  el usuario viaja solo por stdin, nunca como argumento ni como ruta.
- **Argumentos fijos.** La lista de opciones de Pandoc es constante salvo un booleano.
- **Ejecutable resuelto a ruta absoluta** en directorios del sistema, no en el `PATH` con
  el que arrancó el servidor.
- **Directorio temporal propio** por trabajo, vacío y borrado al terminar.
- **Entorno mínimo.** El proceso no hereda las variables del servidor, así que no puede
  filtrar sus secretos.
- **Límites.** Tiempo de reloj (10 s, con `SIGKILL`), tiempo de CPU y tamaño de archivo
  (`prlimit`), memoria (`+RTS -M512m`, el límite de montículo de Pandoc), salida capturada
  (8 MB) y entrada (500 000 caracteres, cortada mientras se lee).
- **Concurrencia.** Un semáforo permite cuatro conversiones a la vez; el resto espera
  hasta cinco segundos y después recibe `busy`.
- **`pandoc --sandbox`.** Pandoc no puede leer archivos ni acceder a la red.
- **Cabeceras de seguridad** (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) en `next.config.ts`.

En vigor desde la fase 4:

- **HTML saneado en el cliente** antes de mostrarse (véase la vista previa).
- **Sin HTML en bruto.** El filtro de Pandoc lo elimina; `<script>` nunca llega al
  navegador.
- **Sin peticiones a terceros.** Las imágenes remotas no se cargan.
- **Imágenes validadas por contenido**, con límite de 5 MB por imagen y 50 por documento.

El LaTeX escrito a mano dentro del Markdown (por ejemplo `\input{...}`) se conserva en la
salida: es texto y convertirlo no ejecuta nada. Su riesgo aparece al compilar, y ahí se
controla.

Previsto para la fase 5:

- Tectonic con `--untrusted` (sin `shell-escape`) y con su bundle en caché, sin red.
- En producción, el runner dentro de un contenedor sin red y con sistema de archivos de
  solo lectura salvo el directorio del trabajo.
- Las imágenes remotas de un documento no se descargan; solo se usan archivos subidos.

Limitación conocida: no hay límite de peticiones por usuario hasta que exista
autenticación (fase 7). El semáforo protege al servidor, no reparte el turno.

## Persistencia (fase 7)

Hasta la fase 7 los documentos vivirán en el navegador detrás de una interfaz
`DocumentStore`. En la fase 7 esa interfaz pasa a la API, sin cambios en el editor.

Modelo previsto: `User`, `Account` y `Session` (Auth.js); `Folder`; `Document`
(Markdown, plantilla y configuración); `DocumentVersion` (historial); `BibEntry`;
`Asset` (imágenes).

## Decisiones tomadas

| Decisión                                                 | Motivo                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Una app, no un monorepo                                  | Un solo despliegue; las capas se separan por carpetas y por lint.          |
| Diseño de paneles en cookie                              | El servidor pinta el diseño guardado sin parpadeo.                         |
| Atajos de panel con `Alt`                                | Los navegadores reservan `Ctrl`/`Cmd` + dígito para las pestañas.          |
| Fuente serif autoalojada                                 | Build reproducible y sin avisos; las demás usan `next/font/google`.        |
| shadcn/ui sobre Radix                                    | Primitivas accesibles cuyo código queda en el repositorio.                 |
| `$` no se cierra automáticamente                         | Un `$` de cierre tras un precio convertiría la frase en fórmula.           |
| Cursiva con `_`, no con `*`                              | Evita ambigüedades con los asteriscos de la negrita.                       |
| Título derivado de los metadatos o del primer encabezado | No hay nombre que mantener aparte hasta la gestión documental.             |
| Código con `listings` en el documento completo           | LaTeX idiomático en vez de decenas de macros de resaltado.                 |
| Identificadores ASCII (`ascii_identifiers`)              | Etiquetas legibles: `introduccion`, no `introducciuxf3n`.                  |
| Memoria con `+RTS -M`, no con `RLIMIT_AS`                | El runtime de Haskell reserva direcciones que un rlimit rompería.          |
| KaTeX en el cliente, no en el servidor                   | Componer fórmulas es trabajo de CPU sin aislar; que lo haga quien escribe. |
| Sanear con DOMPurify en el cliente                       | Usa el analizador real del navegador, en el punto de inserción.            |
| Imágenes remotas no se muestran                          | El PDF se compila sin red; la vista previa no promete lo que no habrá.     |
| Solo PNG y JPEG                                          | Son los formatos que el motor LaTeX puede incluir.                         |
| Zoom con la propiedad CSS `zoom`                         | Escala también el diseño, así el desplazamiento sigue siendo correcto.     |

## Riesgos conocidos

- Tectonic necesita descargar su bundle de paquetes una vez. La imagen de producción lo
  incluirá ya en caché para compilar sin red.
