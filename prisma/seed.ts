/**
 * Demo data: an account to try TexFlow with, a folder and a few documents that show
 * what the templates do. Run with `pnpm db:seed`; it does nothing if the account is
 * already there.
 *
 *   Correo: demo@texflow.local
 *   Contraseña: texflow-demo
 *
 * For local development and demos only: never seed a production database.
 */
import { createDocument } from "@/server/documents/documents";
import { createWelcomeDocument } from "@/server/documents/welcome";
import { createFolder } from "@/server/folders/folders";
import { db } from "@/server/db/client";
import { createUserWithPassword } from "@/server/users/users";
import { templateSettings } from "@/templates/catalog";
import type { TemplateId } from "@/templates/settings";

const DEMO_ACCOUNT = {
  name: "Cuenta de demostración",
  email: "demo@texflow.local",
  // aislop-ignore-next-line security/hardcoded-secret -- a published demo password, for local use only
  password: "texflow-demo",
};

const say = (message: string) => process.stdout.write(`${message}\n`);

const CALCULUS = String.raw`---
title: Apuntes de cálculo
subtitle: Límites, derivadas e integrales
author: Cuenta de demostración
---

# Límites

Decimos que $f$ tiende a $L$ cuando $x$ tiende a $a$ si, para todo $\varepsilon > 0$,
existe $\delta > 0$ tal que

$$
0 < |x - a| < \delta \implies |f(x) - L| < \varepsilon .
$$

Un límite que conviene recordar es $\lim_{x \to 0} \frac{\sin x}{x} = 1$.

# Derivadas

La derivada de $f$ en $a$ es el límite del cociente incremental:

$$
f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}.
$$

| Función    | Derivada          |
| ---------- | ----------------- |
| $x^n$      | $n x^{n-1}$       |
| $e^x$      | $e^x$             |
| $\ln x$    | $1/x$             |
| $\sin x$   | $\cos x$          |

: Derivadas de las funciones elementales

# Integrales

El teorema fundamental del cálculo relaciona ambas ideas[^1]:

$$
\int_a^b f'(x) \, dx = f(b) - f(a).
$$

[^1]: Siempre que $f'$ sea continua en $[a, b]$.
`;

const MANUAL = `---
title: Manual de instalación
author: Cuenta de demostración
---

# Requisitos

Antes de empezar, comprueba que tienes:

- Node.js 22 o posterior.
- PostgreSQL 16.
- Pandoc 3.1 y Tectonic 0.15.

# Instalación

Clona el repositorio e instala las dependencias:

~~~bash
git clone https://github.com/ejemplo/proyecto.git
cd proyecto
pnpm install
~~~

Copia la configuración de ejemplo y edítala:

~~~bash
cp .env.example .env.local
~~~

# Configuración

| Variable       | Obligatoria | Descripción                     |
| -------------- | :---------: | ------------------------------- |
| \`DATABASE_URL\` |     Sí      | Conexión con PostgreSQL         |
| \`AUTH_SECRET\`  |     Sí      | Firma las sesiones              |
| \`PORT\`         |     No      | Puerto del servidor (por defecto 3000) |

: Variables de entorno

# Solución de problemas

> Si la compilación falla con «paquete no encontrado», vuelve a ejecutar el script de
> preparación de Tectonic.
`;

const ESSAY = String.raw`---
title: La Revolución industrial
subtitle: Trabajo de Historia contemporánea
author: Cuenta de demostración
---

# Introducción

La Revolución industrial transformó la manera de producir, de trabajar y de vivir. Comenzó
en Gran Bretaña a mediados del siglo XVIII y se extendió por Europa y Norteamérica a lo
largo del XIX.[^1]

# Causas

Entre sus causas suelen señalarse:

1. El crecimiento de la población y de la demanda.
2. La disponibilidad de carbón y de hierro.
3. Las innovaciones técnicas, como la máquina de vapor de Watt (1769).

> «La máquina de vapor fue al siglo XIX lo que el ordenador al XX.»

# Consecuencias

| Ámbito    | Antes                 | Después                  |
| --------- | --------------------- | ------------------------ |
| Trabajo   | Taller artesanal      | Fábrica                  |
| Energía   | Hidráulica y animal   | Vapor                    |
| Población | Mayoritariamente rural | Creciente urbanización  |

: Cambios principales

# Conclusión

Sus efectos llegan hasta hoy: la ciudad moderna, el trabajo asalariado y la idea misma
de progreso técnico nacen en este periodo.

[^1]: Las fechas varían según el país y el historiador.
`;

const EXAMPLES: readonly {
  readonly markdown: string;
  readonly templateId: TemplateId;
}[] = [
  { markdown: CALCULUS, templateId: "mathematical-report" },
  { markdown: MANUAL, templateId: "technical-documentation" },
  { markdown: ESSAY, templateId: "university-assignment" },
];

async function main() {
  const created = await createUserWithPassword(DEMO_ACCOUNT);
  if (!created.ok) {
    say(`La cuenta ${DEMO_ACCOUNT.email} ya existe: no se ha cambiado nada.`);
    return;
  }
  const { user } = created;
  await createWelcomeDocument(user.id, user.name);

  const folder = await createFolder(user.id, "Ejemplos");
  if (!folder.ok) throw new Error(`No se pudo crear la carpeta: ${folder.reason}`);
  for (const example of EXAMPLES) {
    const document = await createDocument(user.id, {
      markdown: example.markdown,
      settings: templateSettings(example.templateId),
      folderId: folder.folder.id,
    });
    if (!document.ok)
      throw new Error(`No se pudo crear un documento: ${document.reason}`);
  }

  say(`Cuenta de demostración creada: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
