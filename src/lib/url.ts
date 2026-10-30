export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Destino do ?next= do login: só caminhos internos (evita redirecionar para outro site). */
export function safeNext(next: string | null | undefined) {
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}

/** Monta uma URL preservando os parâmetros atuais; `null` remove a chave. */
export function hrefWith(
  pathname: string,
  current: SearchParams,
  updates: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value != null && value !== "") params.set(k, value);
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") params.delete(k);
    else params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Alterna ordenação asc → desc → padrão para a coluna. */
export function sortHref(pathname: string, sp: SearchParams, column: string) {
  const sort = param(sp, "sort");
  const dir = param(sp, "dir");
  if (sort !== column) return hrefWith(pathname, sp, { sort: column, dir: "asc", page: null });
  if (dir !== "desc") return hrefWith(pathname, sp, { sort: column, dir: "desc", page: null });
  return hrefWith(pathname, sp, { sort: null, dir: null, page: null });
}
