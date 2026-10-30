import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** Sessão do request atual (memoizada por request). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Usado em páginas, layouts e server actions: sem sessão válida, vai para o login. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
