import { z } from "zod";

/**
 * Sign-up and sign-in rules, shared by the forms (for immediate feedback) and the
 * server (which enforces them).
 */

export const PASSWORD_LIMITS = { min: 8, max: 128 } as const;

/** Lower-cased and trimmed: one address is one account, however it is typed. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe una dirección de correo válida.").max(254));

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_LIMITS.min,
    `La contraseña necesita al menos ${PASSWORD_LIMITS.min} caracteres.`,
  )
  .max(
    PASSWORD_LIMITS.max,
    `La contraseña admite como mucho ${PASSWORD_LIMITS.max} caracteres.`,
  );

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre.")
    .max(80, "El nombre es demasiado largo."),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  // Any length is checked against the hash; the rules apply when the password is set.
  password: z.string().min(1, "Escribe tu contraseña.").max(PASSWORD_LIMITS.max),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
