# TexFlow — Markdown to LaTeX Studio

Escribe en Markdown y obtén LaTeX válido y un PDF profesional, con vista previa en tiempo
real. Pensado para estudiantes, investigadores y desarrolladores que necesitan documentos
académicos o técnicos sin aprender LaTeX.

## Estado

El proyecto se construye por fases. Cada fase termina con el código verificado, los tests
en verde y esta tabla actualizada.

| Fase | Contenido                                                      | Estado     |
| ---- | -------------------------------------------------------------- | ---------- |
| 1    | Configuración, arquitectura, sistema visual y shell del editor | Completada |
| 2    | Editor Markdown con CodeMirror 6 y guardado automático         | Completada |
| 3    | Conversión Markdown a LaTeX con Pandoc en el backend           | Completada |
| 4    | Vista previa con KaTeX, tablas, imágenes y zoom                | Completada |
| 5    | Compilación PDF con Tectonic y exportaciones                   | Pendiente  |
| 6    | Plantillas documentales                                        | Pendiente  |
| 7    | Usuarios (Auth.js) y documentos (PostgreSQL + Prisma)          | Pendiente  |
| 8    | Bibliografía BibTeX, historial de versiones, onboarding        | Pendiente  |

### Qué funciona hoy

Shell del editor (fase 1):

- Tres paneles (Markdown, LaTeX y Vista previa) redimensionables, ocultables y
  reordenables. El diseño se recuerda entre visitas.
- Tema oscuro por defecto, tema claro y modo "como el sistema".
- Vista de un panel a la vez en pantallas estrechas.

Editor Markdown (fase 2):

- CodeMirror 6 con numeración de líneas, resaltado de sintaxis, búsqueda y reemplazo
  (`Ctrl/Cmd+F`), historial de deshacer y ajuste de línea.
- Resaltado de encabezados, listas, tablas, citas, enlaces, imágenes y bloques de código
  (cada bloque en su propio lenguaje, cargado bajo demanda).
- Fórmulas con sintaxis LaTeX, `$...$` y `$$...$$`, según las reglas de Pandoc: un precio
  como `$5` no se confunde con una fórmula. También notas al pie `[^1]`.
- Barra de herramientas y atajos de formato.
- Inserciones rápidas: escribe `/` para insertar una tabla, un bloque de código, una
  fórmula, una imagen, un enlace o una nota. Tras `\` se sugieren comandos de LaTeX.
- Guardado automático en el navegador, con indicador de estado. `Ctrl/Cmd+S` guarda al
  instante.
- El título del documento se toma de su primer encabezado.
- Posición del cursor y recuento de palabras.
- El texto, el cursor y el historial de deshacer se conservan al ocultar y mostrar el
  panel.

Conversión a LaTeX (fase 3):

- El Markdown se convierte con Pandoc en el servidor tras cada pausa al escribir. Admite
  encabezados, negrita y cursiva, listas, enlaces, imágenes, tablas, citas, código en
  línea y en bloque, fórmulas y notas al pie.
- Panel LaTeX de solo lectura con resaltado, numeración de líneas y búsqueda.
- Dos salidas: el documento completo, listo para compilar, o solo el cuerpo para pegarlo
  en un proyecto propio. El cuerpo va encabezado con las líneas de preámbulo que necesita.
- Copiar el código y descargarlo como `.tex` con el nombre del documento.
- Los metadatos YAML (`title`, `author`, `date`) al inicio del documento pasan al LaTeX y
  dan nombre al documento.
- Errores de conversión explicados en el panel, con su línea cuando Pandoc la indica; se
  mantiene visible el último código correcto.
- Pandoc se ejecuta aislado: sin shell, con `--sandbox`, en un directorio temporal propio
  y con límites de tiempo, CPU, memoria, tamaño y concurrencia.

Vista previa (fase 4):

- El documento se compone sobre una hoja A4 a tamaño real, con la tipografía y el aspecto
  del resultado en LaTeX: texto justificado, tablas de tres líneas, figuras numeradas y
  notas al pie.
- Fórmulas con KaTeX, en línea y en bloque. Una fórmula con un error se muestra en su
  sitio, marcada, sin romper el resto.
- Bloque de título a partir de los metadatos YAML (`title`, `author`, `date`).
- Se actualiza sola tras cada pausa al escribir y solo redibuja los bloques que cambian.
- Zoom: ajustar al ancho del panel, acercar y alejar entre el 50 % y el 200 %.
- Imágenes PNG y JPEG: se añaden con el botón de la barra, pegándolas o arrastrándolas al
  editor. Se guardan en el navegador con el documento y se muestran en la vista previa.
- El HTML se sanea antes de mostrarse: nada de lo escrito en el documento puede ejecutar
  código ni cargar recursos externos.

Límites actuales:

- La vista previa es una aproximación rápida y continua, sin saltos de página. La
  composición exacta será la del PDF (fase 5).
- Las imágenes remotas no se muestran: el PDF se compilará sin red, así que hay que
  añadirlas al documento.
- Las imágenes añadidas no se pueden listar ni borrar todavía.
- El preámbulo del documento LaTeX completo es el genérico de Pandoc; las plantillas
  propias llegan en la fase 6.

### Atajos de teclado

| Acción                          | Windows y Linux           | macOS               |
| ------------------------------- | ------------------------- | ------------------- |
| Mostrar u ocultar un panel      | `Alt+1`, `Alt+2`, `Alt+3` | `⌥1`, `⌥2`, `⌥3`    |
| Mostrar los tres paneles        | `Alt+0`                   | `⌥0`                |
| Guardar                         | `Ctrl+S`                  | `⌘S`                |
| Negrita, cursiva                | `Ctrl+B`, `Ctrl+I`        | `⌘B`, `⌘I`          |
| Código en línea, enlace         | `Ctrl+E`, `Ctrl+K`        | `⌘E`, `⌘K`          |
| Lista numerada, lista, cita     | `Ctrl+Shift+7`, `8`, `9`  | `⌘⇧7`, `8`, `9`     |
| Título, sección, subsección     | `Ctrl+Shift+1`, `2`, `3`  | `⌘⌥1`, `2`, `3`     |
| Buscar                          | `Ctrl+F`                  | `⌘F`                |
| Salir del editor con el teclado | `Esc` y luego `Tab`       | `Esc` y luego `Tab` |

## Stack

| Área          | Tecnología                                          | Desde  |
| ------------- | --------------------------------------------------- | ------ |
| Framework     | Next.js 16 (App Router, Cache Components), React 19 | Fase 1 |
| Lenguaje      | TypeScript en modo estricto                         | Fase 1 |
| Estilos       | Tailwind CSS 4, shadcn/ui (Radix), Lucide           | Fase 1 |
| Validación    | Zod                                                 | Fase 1 |
| Tests         | Vitest, Testing Library, Playwright                 | Fase 1 |
| Editor        | CodeMirror 6                                        | Fase 2 |
| Conversión    | Pandoc                                              | Fase 3 |
| Matemáticas   | KaTeX                                               | Fase 4 |
| PDF           | Tectonic                                            | Fase 5 |
| Persistencia  | PostgreSQL, Prisma                                  | Fase 7 |
| Autenticación | Auth.js                                             | Fase 7 |

## Requisitos

- Node.js 22 o superior.
- pnpm 10 (`corepack enable` lo instala).

- Pandoc 3.1 o superior. En Debian y Ubuntu: `sudo apt-get install pandoc`. En macOS:
  `brew install pandoc`.
- Linux para los límites de CPU y tamaño de archivo del sandbox (usan `prlimit`). En otros
  sistemas la aplicación funciona, con los límites de tiempo, memoria y salida.

Las fases 5 y 7 añadirán Tectonic y PostgreSQL.

## Instalación

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

La aplicación queda en <http://localhost:3000>.

### Variables de entorno

| Variable              | Descripción                  | Valor por defecto       |
| --------------------- | ---------------------------- | ----------------------- |
| `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación | `http://localhost:3000` |
| `PANDOC_PATH`         | Ejecutable de Pandoc         | `pandoc`                |

Las variables se validan con Zod en `src/config/env.ts`; la aplicación no arranca con un
valor inválido.

## Scripts

| Comando          | Qué hace                                                |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                                  |
| `pnpm build`     | Build de producción                                     |
| `pnpm start`     | Sirve el build de producción                            |
| `pnpm lint`      | ESLint                                                  |
| `pnpm typecheck` | Genera los tipos de rutas y ejecuta `tsc`               |
| `pnpm format`    | Formatea con Prettier                                   |
| `pnpm test`      | Tests unitarios (Vitest)                                |
| `pnpm test:e2e`  | Tests end-to-end (Playwright, compila y sirve el build) |
| `pnpm check`     | Lint, tipos, formato y tests unitarios                  |

Para los tests end-to-end en una máquina nueva:

```bash
pnpm exec playwright install chromium
```

## Estructura

```
src/
├─ app/                 Rutas: layout, página del editor, error, 404 y api/convert
├─ components/
│  ├─ ui/               Primitivas shadcn/ui adaptadas a los tokens
│  ├─ brand/            Logotipo
│  ├─ feedback/         Mensajes a pantalla completa
│  └─ theme/            Proveedor de tema
├─ features/
│  ├─ workspace/        Shell del editor
│  │  ├─ model/         Modelo puro del diseño de paneles y su cookie
│  │  ├─ hooks/         Estado React del diseño
│  │  └─ components/    Barra superior, paneles, menús
│  ├─ document/         El documento abierto
│  │  ├─ model/         Sesión con guardado automático, almacén, título y recuento
│  │  ├─ hooks/         Enlace con React
│  │  └─ components/    Título e indicador de guardado
│  ├─ editor/           Editor Markdown
│  │  ├─ codemirror/    Sintaxis, comandos, sugerencias, atajos y tema (sin React)
│  │  ├─ hooks/         Caché del estado del editor
│  │  └─ components/    Editor, barra de herramientas y barra de estado
│  ├─ latex-output/     Panel LaTeX
│  │  ├─ model/         Cliente de la API y cálculo de cambios mínimos
│  │  ├─ hooks/         Conversión con pausa y descarte de respuestas obsoletas
│  │  └─ components/    Visor, opciones de salida, avisos y estado
│  ├─ conversion/       Lo común a los paneles que alimenta el servidor
│  │  ├─ model/         Petición validada a una ruta de conversión
│  │  ├─ hooks/         Conversión con pausa y descarte de respuestas obsoletas
│  │  └─ components/    Aviso de error y barra de estado
│  ├─ assets/           Imágenes del documento
│  │  ├─ model/         Validación, nombres, almacén (IndexedDB) y biblioteca
│  │  └─ hooks/         Enlace con React
│  └─ preview/          Vista previa
│     ├─ model/         Saneado del HTML, fórmulas, imágenes, parcheo del DOM y zoom
│     ├─ hooks/         HTML de la vista previa
│     └─ components/    Hoja de papel, documento y controles de zoom
├─ server/              Lógica de servidor, sin React
│  ├─ sandbox/          Ejecución aislada de procesos y límite de concurrencia
│  ├─ conversion/       Pandoc: ejecución común, LaTeX y HTML de la vista previa
│  └─ http/             Lectura segura de cuerpos de petición
├─ contracts/           Esquemas de la API compartidos por cliente y servidor
├─ hooks/               Hooks compartidos (atajos, media queries)
├─ config/              Entorno validado, atajos, datos del sitio
├─ lib/                 Utilidades puras y piezas de CodeMirror compartidas
└─ styles/              Tokens de diseño y colores de sintaxis
pandoc/                 Filtro y plantilla que el servidor pasa a Pandoc
e2e/                    Tests Playwright
docs/                   Arquitectura y sistema visual
```

Las carpetas `prisma` y `docker` aparecerán con las fases que las llenan.

## API

### `POST /api/convert`

Convierte Markdown a LaTeX.

```json
{ "markdown": "# Hola", "standalone": true }
```

`standalone` es opcional (por defecto `true`): `true` devuelve un documento completo y
`false` solo el cuerpo. El documento admite hasta 500 000 caracteres.

Respuesta correcta (`200`):

```json
{ "ok": true, "latex": "\\section{Hola}", "warnings": [] }
```

Respuesta de error:

```json
{ "ok": false, "error": { "code": "syntax", "message": "…", "detail": "…", "line": 2 } }
```

| Código            | HTTP | Significado                                      |
| ----------------- | ---- | ------------------------------------------------ |
| `invalid-request` | 400  | La petición no es JSON válido o le faltan campos |
| `too-large`       | 413  | El documento supera el tamaño máximo             |
| `syntax`          | 422  | Error en el bloque de metadatos YAML             |
| `limit-exceeded`  | 422  | Se superó el límite de tiempo, memoria o salida  |
| `busy`            | 503  | Demasiadas conversiones a la vez                 |
| `unavailable`     | 503  | Pandoc no está instalado o no se pudo ejecutar   |
| `failed`          | 500  | Pandoc falló por otro motivo                     |

### `POST /api/preview`

Devuelve el documento como fragmento HTML para la vista previa.

```json
{ "markdown": "# Hola" }
```

Respuesta correcta (`200`):

```json
{ "ok": true, "html": "<h1 id=\"pv-hola\">Hola</h1>", "warnings": [] }
```

Los errores tienen la misma forma y los mismos códigos que en `/api/convert`.

El HTML refleja lo que escribió el autor (destinos de enlaces, atributos), así que **no
es seguro insertarlo tal cual**: el cliente lo sanea antes de mostrarlo.

## Documentación

- [Arquitectura](docs/architecture.md): capas, flujo de conversión, modelo de seguridad y
  plan por fases.
- [Sistema visual](docs/design-system.md): tokens, tipografía y reglas de la interfaz.

## Calidad

- `pnpm check` y `pnpm test:e2e` deben pasar antes de cerrar cada fase.
- La integración continua (`.github/workflows/ci.yml`) ejecuta lint, tipos, formato, tests
  unitarios, build y tests end-to-end.
- Una regla de ESLint impide que el código de cliente importe módulos de `src/server`.

## Despliegue

Hoy la aplicación es un servidor Next.js estándar:

```bash
pnpm build
```

```bash
pnpm start
```

El backend ejecuta Pandoc, y desde la fase 5 ejecutará Tectonic, como procesos
aislados. Eso exige un host que permita ejecutar binarios, así que el destino previsto es
un contenedor (la imagen se añade en la fase 5), no una plataforma solo serverless.
