export function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/join")
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}
