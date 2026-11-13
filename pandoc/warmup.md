---
title: Documento de calentamiento
author: TexFlow
date: 2026
---

# Encabezado

Este documento usa todo lo que la conversión puede generar, para que el motor LaTeX
descargue una vez los paquetes que necesitará después sin red.

## Texto

**Negrita**, _cursiva_, ~~tachado~~, `código`, H~2~O, x^2^, [enlace](https://pandoc.org)
y una nota[^1]. "Comillas" y --- rayas.

- [ ] tarea
- [x] hecha

1. uno
2. dos

Término
:   Definición.

> Una cita.

---

## Matemáticas

En línea $e^{i\pi} + 1 = 0$, $\mathbb{R}$, $\mathcal{L}$, $\mathbf{x}$, $\vec{v}$ y en bloque:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}, \qquad
\begin{pmatrix} a & b \\ c & d \end{pmatrix}, \qquad \sum_{i=1}^{n} \frac{1}{i^2}
$$

## Tabla, código e imagen

| Izquierda | Centro | Derecha |
|:----------|:------:|--------:|
| a         |   b    |       c |

: Una tabla con pie.

```python
def f(x: int) -> int:
    return x + 1
```

![Una figura](warmup.png){width=50%}

[^1]: La nota al pie.
