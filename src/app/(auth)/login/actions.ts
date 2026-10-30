"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { safeNext } from "@/lib/url";

export type LoginState = { error?: string; email?: string };

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
  rememberMe: z.boolean(),
  next: z.string().optional(),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    rememberMe: formData.get("rememberMe") === "on",
    next: String(formData.get("next") ?? "") || undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: parsed.data.rememberMe,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "E-mail ou senha incorretos.", email };
    }
    throw error;
  }

  redirect(safeNext(parsed.data.next));
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
