import type { z } from "zod";

/** Retorno padrão das server actions (exibido em toasts e nos campos). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string; warning?: string }
  | { ok: false; error: string; fields?: Record<string, string> };

/** Erros do zod em { campo: mensagem } para exibir nos campos. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
