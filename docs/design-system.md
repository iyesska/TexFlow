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

| Componente            | Ubicación                             | Uso                                             |
| --------------------- | ------------------------------------- | ----------------------------------------------- |
| `Wordmark`            | `src/components/brand`                | Logotipo                                        |
| `ShortcutKeys`        | `src/components`                      | Muestra un atajo como teclas                    |
| `FullPageMessage`     | `src/components/feedback`             | Error y 404                                     |
| `PaneFrame`           | `src/features/workspace/components`   | Marco común de los paneles                      |
| `PaperSheet`          | `src/features/preview/components`     | La hoja A4 de la vista previa                   |
| `SaveIndicator`       | `src/features/document/components`    | Estado de guardado del documento                |
| `EditorToolbar`       | `src/features/editor/components`      | Controles de formato del editor                 |
| `ConversionAlert`     | `src/features/conversion/components`  | Error de conversión sobre el último resultado   |
| `ConversionStatusBar` | `src/features/conversion/components`  | Pie de un panel que alimenta el servidor        |
| `DocumentSheet`       | `src/features/preview/components`     | El documento compuesto sobre la hoja            |
| `PdfDocument`         | `src/features/preview/components`     | El PDF compilado, página a página               |
| `CompileProblems`     | `src/features/compilation/components` | Errores de LaTeX, con salto a la línea          |
| `ExportMenu`          | `src/features/export/components`      | Las formas de sacar el documento                |
| `DesignPanel`         | `src/features/templates/components`   | Panel lateral de plantilla y ajustes            |
| `TemplateThumbnail`   | `src/features/templates/components`   | Miniatura de la primera página de una plantilla |

## Reglas

- Todo elemento interactivo tiene estados de hover, foco visible y deshabilitado.
- El foco siempre es visible y usa el acento.
- Nunca `transition: all`; se transicionan propiedades concretas.
- Los iconos son de Lucide, con un único grosor de trazo.
- Los estados vacíos explican qué aparecerá y cómo actuar.
- El nombre de una acción es el mismo en el botón y en su confirmación.
