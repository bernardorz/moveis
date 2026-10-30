import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista (só presença do cookie). A validação real da sessão é
// feita no layout do app, na página de login e em cada server action. O cookie
// pode estar vencido, então ele nunca é motivo para sair de /login: o layout
// mandaria de volta, em loop.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|ico|webp)$).*)"],
};
