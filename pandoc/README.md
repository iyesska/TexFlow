# Recursos de Pandoc

Archivos que el servidor pasa a Pandoc por su ruta. Deben desplegarse junto a la
aplicación.

| Archivo                  | Uso                                                        |
| ------------------------ | ---------------------------------------------------------- |
| `filters/strip-raw.lua`  | Quita el HTML y el TeX en bruto de la vista previa         |
| `templates/preview.html` | Fragmento HTML de la vista previa, con el bloque de título |

Son código propio y de confianza: el contenido del usuario nunca se escribe aquí.
