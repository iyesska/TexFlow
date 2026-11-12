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
| 3    | Conversión Markdown a LaTeX con Pandoc en el backend           | Pendiente  |
| 4    | Vista previa con KaTeX, tablas, imágenes y zoom                | Pendiente  |
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

Todavía sin contenido real: los paneles LaTeX y Vista previa explican qué mostrarán y en
qué fase llegan. Las imágenes se pueden referenciar, pero aún no subir.

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

A partir de las fases 3, 5 y 7 harán falta también Pandoc, Tectonic y PostgreSQL. Este
documento se ampliará cuando lleguen.

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
├─ app/                 Rutas: layout, página del editor, error y 404
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
│  └─ preview/          Hoja de papel de la vista previa
├─ hooks/               Hooks compartidos (atajos, media queries)
├─ config/              Entorno validado, atajos, datos del sitio
├─ lib/                 Utilidades puras
└─ styles/              Tokens de diseño y colores de sintaxis
e2e/                    Tests Playwright
docs/                   Arquitectura y sistema visual
```

Las carpetas `src/server`, `prisma` y `docker` aparecerán con las fases que las llenan.

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

Desde la fase 3 el backend ejecuta Pandoc, y desde la fase 5 Tectonic, como procesos
aislados. Eso exige un host que permita ejecutar binarios, así que el destino previsto es
un contenedor (la imagen se añade en la fase 5), no una plataforma solo serverless.
