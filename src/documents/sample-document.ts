/** The document a new user starts with: a tour of what TexFlow understands. */
export const SAMPLE_DOCUMENT = `---
title: Introducción a TexFlow
author: Tu nombre
abstract: Este documento de ejemplo recorre lo que TexFlow entiende. Cámbialo o bórralo cuando quieras empezar.
---

Escribe en **Markdown** y TexFlow genera el documento _LaTeX_ por ti. Las líneas entre los dos \`---\` del principio son los metadatos: el título, la autoría y el resumen que las plantillas colocan en su sitio. Elige plantilla en **Diseño**, arriba.

# Texto y listas

Puedes combinar **negrita**, _cursiva_, \`código en línea\` y [enlaces](https://pandoc.org). Las listas se continúan solas al pulsar Enter:

- Encabezados con \`#\`
- Listas ordenadas y sin ordenar
- Citas, tablas y bloques de código

1. Escribe una barra \`/\` al inicio de una línea para ver las inserciones rápidas.
2. Usa la barra de herramientas o el teclado para dar formato.

> La tipografía es el oficio de dotar al lenguaje humano de una forma visual duradera.
> — Robert Bringhurst

# Matemáticas

Las fórmulas usan la sintaxis de LaTeX. En línea: $e^{i\\pi} + 1 = 0$. En bloque:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

# Tablas

| Método | Error medio | Tiempo (s) |
| ------ | ----------: | ---------: |
| Euler  |       0.042 |       1.20 |
| RK4    |       0.003 |       2.85 |

: Comparación de métodos numéricos

# Código

\`\`\`python
def fibonacci(n: int) -> int:
    return n if n < 2 else fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

# Imágenes y notas

Para añadir una imagen PNG o JPEG, usa el botón de la barra de herramientas, pégala o arrástrala al editor.

Las notas al pie se escriben así[^1].

[^1]: Y su contenido va en cualquier lugar del documento.
`;

/** The sample, signed with the new user's name when there is one. */
export function welcomeDocument(authorName: string | null): string {
  const name = authorName?.replace(/[\r\n"\\]/g, " ").trim();
  return name
    ? SAMPLE_DOCUMENT.replace("author: Tu nombre", `author: "${name}"`)
    : SAMPLE_DOCUMENT;
}
