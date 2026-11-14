# Sistema visual

## La idea

Un escritorio de noche. Superficies de grafito, una hoja de papel blanca para el
documento compuesto y un único acento, el amarillo de un rotulador fluorescente, para lo
que quien escribe ha marcado: la selección, el foco y la acción principal.

TexFlow es una herramienta de trabajo. La interfaz debe desaparecer detrás de la tarea:
densidad, consistencia y estados claros antes que expresión.

## Principios

1. **Tres voces, tres tipografías.** Sans para la interfaz, mono para el código fuente y
   serif para la página. Cada panel habla con la suya.
2. **El papel es papel.** La vista previa siempre es una hoja clara, en ambos temas.
3. **El acento se gasta poco.** Selección, foco, tirador activo y botón principal. Nunca
   como decoración. El botón Exportar es el único relleno con el acento en la pantalla:
   es a lo que lleva todo lo demás.
4. **El movimiento informa.** Transiciones de 120 a 180 ms que responden a una acción.
   Sin animaciones de entrada. Se respeta `prefers-reduced-motion`.
5. **Texto en minúsculas normales.** Sin etiquetas en mayúsculas espaciadas ni rótulos
   decorativos sobre los títulos.

## Tokens

Todos los valores están en `src/styles/tokens.css`. Los componentes solo usan utilidades
de Tailwind que apuntan a esos tokens; no hay colores ni fuentes literales fuera de ese
archivo.

### Color

| Token                                       | Uso                                                 |
| ------------------------------------------- | --------------------------------------------------- |
| `background`                                | El escritorio: fondo de la app y de la vista previa |
| `surface`                                   | Paneles                                             |
| `surface-raised`                            | Menús, tooltips, elementos elevados                 |
| `muted`                                     | Fondos de hover y de elementos pulsados             |
| `foreground`                                | Texto principal                                     |
| `muted-foreground`                          | Texto secundario (contraste AA)                     |
| `faint-foreground`                          | Iconos y pistas, nunca texto de lectura             |
| `border`, `border-strong`                   | Líneas sutiles y líneas de énfasis                  |
| `highlight`                                 | El acento: selección, foco, acción principal        |
| `destructive`, `success`, `warning`, `info` | Estados                                             |
| `paper`, `ink`, `ink-muted`                 | La hoja y su texto                                  |

El tema oscuro es el predeterminado; `.light` redefine los mismos tokens.

### Sintaxis

Los paneles de código usan los tokens `syntax-*` a través de las clases `tok-*` de
`src/styles/syntax.css`. Las fórmulas llevan el color del acento: son lo que distingue a
un documento LaTeX. Las marcas de Markdown (`#`, `**`, `>`) se atenúan para que el texto
destaque sobre la notación.

### Tipografía

| Rol       | Fuente           | Utilidad     |
| --------- | ---------------- | ------------ |
| Interfaz  | Instrument Sans  | `font-sans`  |
| Código    | JetBrains Mono   | `font-mono`  |
| Documento | Libertinus Serif | `font-serif` |

Libertinus es una de las fuentes clásicas del mundo LaTeX; también dibuja el logotipo,
con la E caída del logo de TeX. El logotipo precarga su único peso; las cuatro
variantes del documento (redonda, cursiva, negrita y negrita cursiva) se cargan cuando la
vista previa las necesita.

Escala fija en rem: `text-2xs` (11 px), `text-xs` (12 px), `text-ui` (13 px, el tamaño
base de la interfaz) y `text-sm` (14 px).

### El documento

`src/styles/document.css` da estilo al documento de la vista previa (clase
`tf-document`). Imita el resultado en LaTeX para que ambas cosas se lean como el mismo
documento: bloque de texto justificado en serif, tablas de tres líneas sin filetes
verticales, código sin fondo, figuras numeradas y notas al pie bajo un filete corto. Usa
los tokens `ink`, `ink-muted`, `paper-rule` y `paper-error`, y medidas en `pt` y `em` para
escalar con el zoom. La geometría de página sale de las propiedades `--page-*`, que
fijarán las plantillas.

### Las fuentes del documento

La hoja de la vista rápida usa la fuente de la plantilla, la misma que incrusta el PDF:
Libertinus, Latin Modern, TeX Gyre Pagella, Termes y Heros. Están en
`src/app/fonts/document`, sin modificar, con su licencia, y se declaran sin precarga:
el navegador solo descarga la familia que usa el documento. En la biblioteca de
plantillas, el nombre de cada una se escribe en su propia fuente, que es lo que mejor
la distingue.

### Forma y profundidad

- Radio base de 8 px; los paneles usan `rounded-xl`.
- Tres sombras: `shadow-pane`, `shadow-overlay` y `shadow-paper`.
- Los paneles flotan sobre el escritorio con 6 px de separación; esa separación es el
  tirador para redimensionar.

## Componentes propios

| Componente            | Ubicación                              | Uso                                              |
| --------------------- | -------------------------------------- | ------------------------------------------------ |
| `Wordmark`            | `src/components/brand`                 | Logotipo                                         |
| `ShortcutKeys`        | `src/components`                       | Muestra un atajo como teclas                     |
| `FullPageMessage`     | `src/components/feedback`              | Error y 404                                      |
| `PaneFrame`           | `src/features/workspace/components`    | Marco común de los paneles                       |
| `PaperSheet`          | `src/features/preview/components`      | La hoja A4 de la vista previa                    |
| `SaveIndicator`       | `src/features/document/components`     | Estado de guardado del documento                 |
| `EditorToolbar`       | `src/features/editor/components`       | Controles de formato del editor                  |
| `ConversionAlert`     | `src/features/conversion/components`   | Error de conversión sobre el último resultado    |
| `ConversionStatusBar` | `src/features/conversion/components`   | Pie de un panel que alimenta el servidor         |
| `DocumentSheet`       | `src/features/preview/components`      | El documento compuesto sobre la hoja             |
| `PdfDocument`         | `src/features/preview/components`      | El PDF compilado, página a página                |
| `CompileProblems`     | `src/features/compilation/components`  | Errores de LaTeX, con salto a la línea           |
| `ExportMenu`          | `src/features/export/components`       | Las formas de sacar el documento                 |
| `DesignPanel`         | `src/features/templates/components`    | Panel lateral de plantilla y ajustes             |
| `TemplateThumbnail`   | `src/features/templates/components`    | Miniatura de la primera página de una plantilla  |
| `DocumentTitle`       | `src/features/document/components`     | Nombre del documento, editable en su sitio       |
| `BackToLibrary`       | `src/features/workspace/components`    | Vuelta a la biblioteca, tras guardar             |
| `AccountMenu`         | `src/features/account/components`      | Quién ha entrado, tema y cerrar sesión           |
| `Field`               | `src/features/account/components`      | Campo con etiqueta, pista y error enlazados      |
| `PasswordField`       | `src/features/account/components`      | Contraseña que se puede mostrar                  |
| `SampleSheet`         | `src/features/account/components`      | Hoja compuesta y su Markdown, al entrar          |
| `Library`             | `src/features/library/components`      | La biblioteca de documentos                      |
| `DocumentRow`         | `src/features/library/components`      | Un documento, con su menú y su menú contextual   |
| `FolderNav`           | `src/features/library/components`      | Carpetas en la barra lateral                     |
| `FolderChips`         | `src/features/library/components`      | Carpetas como fichas, en pantallas estrechas     |
| `NameDialog`          | `src/features/library/components`      | Pide un nombre: carpeta o documento              |
| `ConfirmDialog`       | `src/features/library/components`      | Confirma lo que no se puede deshacer             |
| `ImportBanner`        | `src/features/library/components`      | Ofrece importar el documento del navegador       |
| `BibliographyPanel`   | `src/features/bibliography/components` | Referencias del documento, para citar            |
| `ReferenceDialog`     | `src/features/bibliography/components` | Formulario de una referencia, según su tipo      |
| `HistoryPanel`        | `src/features/history/components`      | Historial de versiones, en un diálogo amplio     |
| `VersionList`         | `src/features/history/components`      | Línea temporal de versiones, agrupada por día    |
| `VersionChanges`      | `src/features/history/components`      | Cambios línea a línea, con las palabras marcadas |
| `CommandPalette`      | `src/features/commands/components`     | Todas las acciones tras un buscador              |
| `ShortcutsDialog`     | `src/features/commands/components`     | Los atajos de teclado, por grupos                |
| `FirstStepsGuide`     | `src/features/onboarding/components`   | Primeros pasos, con su anillo de progreso        |

## Páginas de cuenta y biblioteca

- **Entrar y crear cuenta.** El formulario a un lado, a la medida de una columna de
  lectura; al otro, en pantallas anchas, el resultado que promete la aplicación: una hoja
  compuesta en Libertinus, con una fórmula de KaTeX, y la tarjeta del Markdown que la
  produce, con los colores del editor. En pantallas estrechas, solo el formulario.
- **Errores en su sitio.** Cada campo muestra su error debajo (`aria-invalid` y
  `aria-describedby`); el error del intento entero va en un aviso sobre el botón. Lo
  escrito se conserva, salvo la contraseña.
- **La biblioteca es una lista.** Densa y legible: miniatura de la plantilla, título,
  plantilla y carpeta, y la fecha en palabras («hace 5 minutos», «ayer»). El botón
  «Nuevo documento» es el único relleno con el acento en la pantalla, como Exportar en el
  editor; su flecha abre las plantillas.
- **Las acciones, en dos sitios.** El menú «…» de cada fila (visible al pasar o al
  enfocar) y el menú contextual ofrecen lo mismo, con las mismas palabras.
- **Primera visita.** Sin documentos, la biblioteca enseña las plantillas como tarjetas:
  elegir una crea el documento.

## Bibliografía, historial y ayuda

- **Referencias, al lado.** Un panel lateral no modal, como Diseño: se cita con el
  editor a la vista. Cada referencia muestra título, autores y año, su clave en
  monoespaciada y si el texto la cita. El botón **Citar** escribe en el cursor.
- **Avisos que llevan a la solución.** Un error del BibTeX dice su línea y lleva al
  texto; una clave citada que falta trae un botón para añadirla.
- **El historial es una línea temporal.** Versiones agrupadas por día con su hora, un
  icono por clase (reloj, marcador, flecha de deshacer) unidos por una línea fina. Las
  versiones con nombre usan el acento: son lo que el escritor marcó.
- **Los cambios, en verde y rojo suaves.** Fondos al 8 % de `--success` y
  `--destructive` para las líneas, al 22 % para las palabras que cambiaron, y el signo
  `+`/`−` además del color. Lo eliminado va tachado. Para los lectores de pantalla, cada
  línea cambiada empieza diciendo si se añadió o se eliminó.
- **Restaurar no asusta.** El botón es el principal del diálogo, no destructivo: la
  confirmación explica que lo actual se guarda antes, y el aviso posterior ofrece
  deshacer.
- **La paleta, arriba.** Aparece en el tercio superior, como en las herramientas que la
  popularizaron, con el atajo de cada acción a la derecha y la pista de teclado al pie.
- **La barra superior no se apretuja.** Hasta `xl`, el selector de paneles baja a una
  segunda fila. Desde ahí, la columna de acciones nunca es más estrecha que su
  contenido. Cada rótulo aparece solo a partir de la anchura en la que cabe; en el
  móvil, Diseño, Referencias e Historial pasan al menú de vista.
- **Primeros pasos, discretos.** Un anillo con la cuenta (2/6) en la barra; el siguiente
  paso, resaltado y con su botón. Se oculta y se recupera desde el menú de vista.

## Reglas

- Todo elemento interactivo tiene estados de hover, foco visible y deshabilitado.
- El foco siempre es visible y usa el acento.
- Nunca `transition: all`; se transicionan propiedades concretas.
- Los iconos son de Lucide, con un único grosor de trazo.
- Los estados vacíos explican qué aparecerá y cómo actuar.
- El nombre de una acción es el mismo en el botón y en su confirmación.
