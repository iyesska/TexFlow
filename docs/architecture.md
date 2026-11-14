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
| Acciones | `src/actions`    | Server Actions de las cuentas: entrar, darse de alta, salir.          | Fase 7 |

Reglas:

- Un componente no contiene lógica de negocio. La lógica vive en un `model/` puro, que se
  prueba sin React, o en `src/server`.
- El código de cliente nunca importa de `src/server`; habla con él por la API o por las
  Server Actions de `src/actions`, que validan su entrada como cualquier ruta. ESLint lo
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

## Compilación a PDF (fase 5)

```
POST /api/compile (multipart: markdown + imágenes)
   ──► readBodyBytes (corta al exceder el tamaño) ──► valida nombres y contenido
   ──► compileDocument
          ├─► convertMarkdownToLatex (Pandoc, el mismo LaTeX que ve el usuario)
          └─► semáforo ──► runProcess, aislamiento obligatorio ──► tectonic
                               entrada: main.tex + imágenes
                               salida:  main.pdf + main.log
   ◄── PDF, o { ok: false, error: { diagnostics } }
```

- **Servicio.** `src/server/compilation/compile-document.ts` escribe el LaTeX y las
  imágenes en el directorio del trabajo, ejecuta Tectonic y recoge el PDF y el log.
- **Diagnósticos.** `diagnostics.ts` convierte la salida de Tectonic en problemas que se
  entienden sin saber LaTeX: una explicación, el mensaje original, la línea del LaTeX y
  su texto. `locate-in-markdown.ts` busca la línea del Markdown que lo causó, por el
  comando o el archivo implicado y por las palabras que comparte con la línea del LaTeX.
  Si no hay una respuesta clara no da ninguna: una línea equivocada es peor que no tenerla.
- **Paquetes sin red.** Tectonic descarga los paquetes LaTeX bajo demanda. Como los
  documentos se compilan sin red, `scripts/setup-tectonic.sh` compila antes, con red, un
  documento que usa todo lo que la conversión puede generar (`pandoc/warmup.md`), y así
  llena la caché. En ejecución Tectonic va con `--only-cached`.
- **Cliente.** `CompilationProvider` guarda el último PDF y sabe si sigue correspondiendo
  al documento; lo comparten el visor y el menú de exportación, de modo que exportar un
  PDF recién compilado no vuelve a compilar. La compilación es explícita (al abrir la
  vista PDF, con el botón o con el atajo), no en cada pausa: es la operación más cara.
- **Visor.** `PdfDocument` usa pdf.js y dibuja cada página cuando se acerca a la zona
  visible, a la resolución de la pantalla.
- **Exportación.** El ZIP del proyecto se arma en el navegador con las fuentes y las
  imágenes en una sola carpeta, que es donde el LaTeX las busca.

## Plantillas (fase 6)

Una plantilla es un conjunto de ajustes de diseño con nombre. Los ajustes son lo único
que cambia el aspecto del documento; el texto nunca se toca.

```
src/templates/settings.ts   esquema Zod de los ajustes (compartido)
src/templates/catalog.ts    las siete plantillas: nombre, estructura y ajustes
        │
        ├─► servidor: src/server/templates/latex-layout.ts
        │     opciones de Pandoc (clase, papel, cuerpo, márgenes, idioma, índice…)
        │     y un preámbulo LaTeX (fuentes, rótulos, portada, cabecera y pie, código)
        │
        └─► cliente: src/features/templates/model/preview-style.ts
              variables CSS para la vista rápida (página, fuente, tamaños de LaTeX)
```

- **Ajustes cerrados.** Cada campo es un valor de una lista o un entero con límites, y
  los márgenes se validan contra el papel (siempre quedan al menos 6 × 8 cm de texto).
  Por eso el servidor puede escribirlos en el preámbulo sin escapar nada: ningún texto
  del documento llega a él.
- **Preámbulo por archivo.** Pandoc lo recibe con `--include-in-header`, como archivo del
  directorio del trabajo; se escribe ahí, junto al documento, y se borra al terminar.
- **Estructura.** Las plantillas de tipo libro (la Tesis) usan la clase `book`, con
  `--top-level-division=chapter` y preliminares con numeración romana.
- **Vista rápida fiel.** La hoja toma el papel y los márgenes de la plantilla, y el
  texto, la misma fuente que el PDF (`src/app/fonts/document`), los tamaños reales de
  las clases de LaTeX (el cuerpo de 11 pt es de 10,95 pt) y su interlineado. Los
  rótulos («Figura», «Tabla», «Capítulo») siguen el idioma. Una portada propia se dibuja
  en una hoja aparte.
- **Persistencia.** Los ajustes se guardan con el documento y se validan al leerlos:
  unos ajustes que ya no validan se sustituyen por los de la plantilla por defecto sin
  perder el texto.
- **Caché de paquetes.** `scripts/setup-tectonic.sh` compila, con red, un documento por
  cada clase, cuerpo e idioma, cargando todas las fuentes y paquetes que pueden pedir
  las plantillas (`pandoc/warmup-preamble.tex`). Las pruebas de
  `src/server/compilation/templates.test.ts` compilan cada plantilla sin red y leen el
  PDF resultante: si a la caché le falta algo, fallan.

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

En vigor desde la fase 5:

- **Aislamiento del sistema operativo** con bubblewrap (`src/server/sandbox/isolation.ts`).
  Dentro, el proceso ve `/usr` en solo lectura, un `/tmp` vacío y su directorio de
  trabajo; no existen `/etc`, `/home`, `/proc` ni los archivos de la aplicación, no ve
  otros procesos y no tiene red.
- **Obligatorio para LaTeX.** Sin ese aislamiento, un documento puede leer cualquier
  archivo del servidor aunque Tectonic vaya con `--untrusted`: se comprobó que
  `\input{/etc/passwd}` acababa en el PDF. Los límites de recursos y la ausencia de shell
  no lo evitan. Por eso, si el host no puede aislar, la compilación responde que no está
  disponible. Pandoc también se aísla cuando el host lo permite.
- **Tectonic con `--untrusted` y `--only-cached`:** sin `shell-escape` y sin red propia.
- **Imágenes validadas otra vez en el servidor:** el nombre debe ser uno de los que
  genera la aplicación, porque se usa como nombre de archivo, y el contenido debe ser el
  formato que el nombre indica.
- **Salidas leídas sin seguir enlaces simbólicos.** El PDF se recoge fuera del sandbox;
  un enlace dejado por el trabajo con ese nombre no se sigue.
- **Compilaciones canceladas** si el cliente se va, y dos como máximo a la vez.

`SANDBOX_ISOLATION=disabled` levanta la exigencia de aislamiento. Existe para usar la
aplicación en la propia máquina, con documentos propios, donde bubblewrap no está
disponible; nunca para un servidor que reciba documentos de otras personas.

En vigor desde la fase 7:

- **Sesión obligatoria** en todas las rutas de la API y en las páginas de documentos.
  El proxy (`src/proxy.ts`) redirige a quien no ha entrado, pero es solo un atajo: cada
  página y cada ruta vuelve a comprobar la sesión antes de tocar datos.
- **Límites por usuario**: 240 conversiones y 20 compilaciones por minuto, 300
  escrituras por minuto (guardados, subidas, cambios en la biblioteca), 10 intentos de
  contraseña por correo cada 15 minutos y 10 altas por conexión cada hora.
- **Origen comprobado** en toda petición que cambia algo: una petición con `Origin` de
  otro sitio se rechaza, se lleve las cookies que se lleve. La cookie de sesión es
  `HttpOnly` y `SameSite=Lax`.
- **Contraseñas con scrypt** (N = 2¹⁵), comparadas en tiempo constante. Un correo que no
  existe cuesta lo mismo que una contraseña equivocada, y el mensaje de error es el mismo:
  no revela qué correos tienen cuenta.
- **Tras entrar solo se va a páginas propias**: del destino pedido se toma la ruta y debe
  ser una página de documentos.
- **Imágenes servidas como imágenes**: el tipo que se comprobó al subirlas,
  `nosniff` y `Content-Security-Policy: default-src 'none'; sandbox`.

## Cuentas y documentos (fase 7)

### Modelo de datos

`prisma/schema.prisma`, con PostgreSQL y el cliente de Prisma generado en
`src/server/db/generated` (fuera de git; `pnpm install` lo genera).

| Modelo                                    | Contenido                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `User`                                    | Nombre, correo único, hash de la contraseña (o nada, si entra con GitHub) |
| `Account`, `Session`, `VerificationToken` | Las tablas de Auth.js, para el inicio de sesión con GitHub                |
| `Folder`                                  | Carpetas de un usuario, de un solo nivel; nombre único por usuario        |
| `Document`                                | Markdown, ajustes de diseño (JSON validado), título, revisión             |
| `Asset`                                   | Imágenes de un documento, en `bytea`; nombre único por documento          |

Borrar una cuenta borra sus carpetas y documentos; borrar un documento, sus imágenes;
borrar una carpeta deja sus documentos fuera de carpetas.

### Acceso a datos

Toda función de `src/server/documents`, `folders` y `assets` recibe el id del
propietario, que sale de la sesión y nunca de la petición, y lo pone en cada consulta.
Un documento ajeno es indistinguible de uno que no existe: `404` en ambos casos.
`getSessionUser` (`src/server/auth/session.ts`) lee la sesión una vez por petición y
comprueba que la cuenta sigue existiendo.

Los ajustes guardados se validan al leerlos: un documento con ajustes de una versión
anterior se abre con el diseño por defecto en lugar de fallar.

### Sesiones

Auth.js v5 con sesiones JWT (30 días) en una cookie cifrada con `AUTH_SECRET`. El alta
y el inicio de sesión con contraseña son Server Actions (`src/actions/account.ts`) que
validan los campos con los mismos esquemas que el formulario (`src/contracts/account.ts`).
Salir recarga la página entera: las páginas que Next.js conserva para volver atrás
guardan documentos de esa cuenta, y no deben quedar en memoria.

### Guardado por revisiones

Cada documento tiene una `revision` que sube con cada guardado. El editor guarda tras
cada pausa, uno a la vez, enviando la revisión de la que partió; el servidor solo
escribe si sigue siendo la actual (`updateMany` con la revisión en la condición). Si no,
responde `409` y la sesión del documento pasa a «Cambiado en otro sitio»: deja de
guardar y pregunta si conservar esta versión o cargar la otra. Nada se sobrescribe sin
preguntar.

Al recargar, el navegador pide la página nueva antes de que salga el último guardado de
la anterior, así que ese guardado puede llegar después. Para no perderlo ni crear un
conflicto falso:

1. Al salir, la pestaña deja lo que falta por guardar en `sessionStorage`
   (`src/features/document/model/pending-work.ts`) y lo envía con `keepalive`.
2. La página nueva, si encuentra trabajo pendiente distinto de lo que muestra, lo
   recupera y lo guarda sobre la revisión de la que partió.
3. El servidor acepta un guardado idéntico a lo que ya tiene aunque la revisión sea
   anterior: es el mismo guardado llegando dos veces.

Los fallos de red se reintentan con espera creciente; una sesión caducada se indica en
la barra y se reintenta cuando se vuelve a entrar en otra pestaña. Los textos de más de
20 000 caracteres no caben en un `keepalive`: con cambios sin guardar, cerrar la página
pide confirmación.

### Imágenes

Se suben a `POST /api/documents/:id/assets`; el servidor comprueba el tipo por el
contenido, elige el nombre y lo devuelve. La vista previa las carga desde su URL, con
`ETag` y revalidación. Al compilar, el editor envía el id del documento y el servidor
toma las imágenes guardadas que el Markdown menciona, sin volver a subirlas.

### Estado entre páginas

Con Cache Components, Next.js no desmonta la página que se deja: la oculta con
`<Activity>` para volver a ella al instante. Por eso:

- La biblioteca sustituye su estado por la lista del servidor cada vez que esta llega
  de nuevo, para reflejar lo hecho en el editor.
- El editor se identifica con el id y la fecha de modificación del documento: si cambió
  desde que se mostró, se abre de nuevo; si no, se recupera tal como estaba.
- Al ocultarse, el editor guarda lo pendiente (los efectos se limpian al ocultar).

### Documentos de antes de las cuentas

Las fases 1 a 6 guardaban un único documento en el navegador. La biblioteca lo detecta
(`src/features/library/model/local-document.ts`) y ofrece importarlo una vez, con sus
imágenes de IndexedDB; después lo borra del navegador. La muestra sin tocar no se ofrece.

## Decisiones tomadas

| Decisión                                                 | Motivo                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Una app, no un monorepo                                  | Un solo despliegue; las capas se separan por carpetas y por lint.                                         |
| Diseño de paneles en cookie                              | El servidor pinta el diseño guardado sin parpadeo.                                                        |
| Atajos de panel con `Alt`                                | Los navegadores reservan `Ctrl`/`Cmd` + dígito para las pestañas.                                         |
| Fuente serif autoalojada                                 | Build reproducible y sin avisos; las demás usan `next/font/google`.                                       |
| shadcn/ui sobre Radix                                    | Primitivas accesibles cuyo código queda en el repositorio.                                                |
| `$` no se cierra automáticamente                         | Un `$` de cierre tras un precio convertiría la frase en fórmula.                                          |
| Cursiva con `_`, no con `*`                              | Evita ambigüedades con los asteriscos de la negrita.                                                      |
| Título derivado de los metadatos o del primer encabezado | No hay nombre que mantener aparte hasta la gestión documental.                                            |
| Código con `listings` en el documento completo           | LaTeX idiomático en vez de decenas de macros de resaltado.                                                |
| Identificadores ASCII (`ascii_identifiers`)              | Etiquetas legibles: `introduccion`, no `introducciuxf3n`.                                                 |
| Memoria con `+RTS -M`, no con `RLIMIT_AS`                | El runtime de Haskell reserva direcciones que un rlimit rompería.                                         |
| KaTeX en el cliente, no en el servidor                   | Componer fórmulas es trabajo de CPU sin aislar; que lo haga quien escribe.                                |
| Sanear con DOMPurify en el cliente                       | Usa el analizador real del navegador, en el punto de inserción.                                           |
| Imágenes remotas no se muestran                          | El PDF se compila sin red; la vista previa no promete lo que no habrá.                                    |
| Solo PNG y JPEG                                          | Son los formatos que el motor LaTeX puede incluir.                                                        |
| Zoom con la propiedad CSS `zoom`                         | Escala también el diseño, así el desplazamiento sigue siendo correcto.                                    |
| bubblewrap para aislar procesos                          | Aísla archivos, red y procesos sin privilegios de root.                                                   |
| Sin aislamiento no se compila                            | Fallar cerrado: mejor no ofrecer el PDF que exponer el servidor.                                          |
| PDF binario en la respuesta, avisos en cabecera          | Evita codificar el PDF en base64 dentro de un JSON.                                                       |
| Compilar a petición, no en cada pausa                    | Es la operación más cara; la vista rápida ya da respuesta inmediata.                                      |
| Paquetes LaTeX descargados de antemano                   | Permite compilar sin red.                                                                                 |
| Plantillas como datos, no como archivos `.latex`         | Un preámbulo generado desde ajustes validados; la plantilla de Pandoc sigue sirviendo para todo lo demás. |
| Fuentes de la vista rápida = fuentes del PDF             | La vista rápida debe parecerse al resultado; las fuentes se cargan solo si la plantilla las usa.          |
| Cabecera y pie solo en el PDF                            | En una hoja continua no hay páginas que numerar; mostrarlos sería inventar.                               |
| Cambiar de plantilla reemplaza los ajustes               | La plantilla es un punto de partida; si se pierden ajustes hechos a mano, se puede deshacer.              |
| Sesiones JWT, no en base de datos                        | Es lo que admite Auth.js con contraseña; la cuenta se comprueba en cada petición igualmente.              |
| Contraseñas con scrypt de Node                           | Resistente a fuerza bruta con hardware y sin módulos nativos que compilar.                                |
| Imágenes en PostgreSQL (`bytea`)                         | Una sola cosa que respaldar y permisos por documento sin un almacén aparte; el tamaño está acotado.       |
| Concurrencia optimista por revisión                      | Varias pestañas o dispositivos sin bloqueos; un conflicto se resuelve preguntando, nunca en silencio.     |
| Títulos con origen (`CONTENT` o `MANUAL`)                | El título sigue al texto hasta que se le da un nombre, y se puede volver a ese comportamiento.            |
| Carpetas de un nivel                                     | Cubren el uso habitual sin la complejidad de un árbol; anidar puede venir después.                        |
| Eliminar sin papelera, con confirmación                  | Simple y explícito; el historial de versiones de la fase 8 cubrirá la recuperación.                       |
| Server Actions solo para las cuentas                     | Auth.js las usa para entrar y salir; los documentos van por una API REST que también usa el editor.       |
| `connection()` antes de leer la sesión                   | Auth.js genera valores aleatorios al leerla; Next.js exige que eso ocurra ya en tiempo de petición.       |

## Riesgos conocidos

- **La imagen Docker no se ha construido de principio a fin.** La red del entorno de
  desarrollo pasa por un proxy que los contenedores no pueden usar. Está comprobado el
  servidor autocontenido que ejecuta, contra PostgreSQL.
- **Límites de peticiones en memoria.** Valen para un proceso. Con varios procesos o
  varias máquinas hace falta un almacén compartido (Redis, por ejemplo) detrás de la
  misma interfaz (`src/server/security/rate-limit.ts`).
- **Sin recuperación de contraseña ni verificación del correo.** Necesitan un servicio de
  correo; Auth.js tiene el proveedor para ello.
- **bubblewrap dentro de Docker** necesita que el contenedor pueda crear espacios de
  nombres de usuario, lo que exige relajar los perfiles seccomp y AppArmor por defecto.
  Es un compromiso: se debilita el aislamiento del contenedor para tener el de cada
  trabajo. La alternativa, para más adelante, es un servicio de compilación separado.
- **Paquetes LaTeX fuera de la caché.** Un documento que cargue a mano un paquete no
  descargado falla con un mensaje que lo dice. Las plantillas están cubiertas: sus
  pruebas compilan cada una sin red.
- **pdfLaTeX sin probar.** El preámbulo incluye una rama para pdfLaTeX (fuentes
  `tgpagella`, `libertinus`…) para quien lleve el `.tex` a otro sistema. El motor del
  proyecto es XeTeX y aquí no hay pdfLaTeX con el que comprobarla.
