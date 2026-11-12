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
| 2    | Editor Markdown con CodeMirror 6 y guardado automático         | Pendiente  |
| 3    | Conversión Markdown a LaTeX con Pandoc en el backend           | Pendiente  |
| 4    | Vista previa con KaTeX, tablas, imágenes y zoom                | Pendiente  |
| 5    | Compilación PDF con Tectonic y exportaciones                   | Pendiente  |
| 6    | Plantillas documentales                                        | Pendiente  |
| 7    | Usuarios (Auth.js) y documentos (PostgreSQL + Prisma)          | Pendiente  |
| 8    | Bibliografía BibTeX, historial de versiones, onboarding        | Pendiente  |

### Qué funciona hoy (fase 1)

- Shell del editor con los tres paneles: Markdown, LaTeX y Vista previa.
- Paneles redimensionables (arrastre o teclado), ocultables y reordenables.
- El diseño de paneles se recuerda entre visitas y se aplica ya en el HTML del servidor.
- Tema oscuro por defecto, tema claro y modo "como el sistema".
- Atajos: `Alt+1`, `Alt+2`, `Alt+3` muestran u ocultan cada panel; `Alt+0` muestra los tres.
- Vista de un panel a la vez en pantallas estrechas.
- Notificaciones, estados de carga, página de error y página 404.

Los paneles todavía no tienen contenido real: cada uno explica qué mostrará y en qué fase
llega.

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
│  └─ preview/          Hoja de papel de la vista previa
├─ hooks/               Hooks compartidos (atajos, media queries)
├─ config/              Entorno validado, atajos, datos del sitio
├─ lib/                 Utilidades puras
└─ styles/              Tokens de diseño
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
