# Arquitectura

Este documento describe cómo está organizado TexFlow y por qué. Distingue lo que ya
existe de lo que está planificado.

## Capas

TexFlow es una sola aplicación Next.js con tres capas que no se mezclan.

| Capa     | Ubicación        | Responsabilidad                                                       | Estado       |
| -------- | ---------------- | --------------------------------------------------------------------- | ------------ |
| Rutas    | `src/app`        | Layouts, páginas y route handlers. Validan la entrada y delegan.      | Fase 1       |
| Features | `src/features/*` | UI de cada área, sus hooks y un modelo puro por feature.              | Fase 1       |
| Servidor | `src/server/*`   | Lógica de negocio sin React: conversión, compilación, sandbox, datos. | Desde fase 3 |

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

## Flujo de conversión (fases 3 a 5)

```
Editor (CodeMirror)
   │  Markdown, con debounce
   ▼
POST /api/convert ──► valida (Zod) ──► ConversionService ──► SandboxRunner ──► pandoc
   │                                                                              │
   ◄──────────────── LaTeX + HTML para la vista previa ◄──────────────────────────┘

POST /api/compile ──► valida ──► CompilationService ──► SandboxRunner ──► tectonic
   │                                                                          │
   ◄──────────────── PDF, o errores con su línea ◄────────────────────────────┘
```

La vista previa tendrá dos modos: HTML rápido con KaTeX mientras se escribe, y PDF real
compilado, con navegación por páginas.

## Modelo de seguridad

Pandoc y LaTeX procesan contenido no confiable. Todo proceso externo pasará por un único
`SandboxRunner` con estas garantías:

- Sin shell: `spawn` con un ejecutable fijo y argumentos de una lista cerrada. El
  contenido del usuario entra por stdin o por archivos, nunca como argumento.
- Un directorio temporal por trabajo, que se borra al terminar. Los nombres de archivo
  los genera el servidor.
- Límites de tiempo (con `SIGKILL` al vencer), memoria, CPU y tamaño de entrada y salida.
- Pandoc con `--sandbox`, que le impide leer archivos y acceder a la red.
- Tectonic con `--untrusted` (sin `shell-escape`) y con su bundle en caché, sin red.
- En producción, el runner ejecuta dentro de un contenedor sin red y con sistema de
  archivos de solo lectura salvo el directorio del trabajo. En desarrollo, límites de
  proceso.
- Las imágenes remotas de un documento no se descargan; solo se usan archivos subidos.

Ya vigente en la fase 1: cabeceras de seguridad (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) en `next.config.ts`.

## Persistencia (fase 7)

Hasta la fase 7 los documentos vivirán en el navegador detrás de una interfaz
`DocumentStore`. En la fase 7 esa interfaz pasa a la API, sin cambios en el editor.

Modelo previsto: `User`, `Account` y `Session` (Auth.js); `Folder`; `Document`
(Markdown, plantilla y configuración); `DocumentVersion` (historial); `BibEntry`;
`Asset` (imágenes).

## Decisiones tomadas

| Decisión                    | Motivo                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| Una app, no un monorepo     | Un solo despliegue; las capas se separan por carpetas y por lint.   |
| Diseño de paneles en cookie | El servidor pinta el diseño guardado sin parpadeo.                  |
| Atajos de panel con `Alt`   | Los navegadores reservan `Ctrl`/`Cmd` + dígito para las pestañas.   |
| Fuente serif autoalojada    | Build reproducible y sin avisos; las demás usan `next/font/google`. |
| shadcn/ui sobre Radix       | Primitivas accesibles cuyo código queda en el repositorio.          |

## Riesgos conocidos

- Tectonic necesita descargar su bundle de paquetes una vez. La imagen de producción lo
  incluirá ya en caché para compilar sin red.
