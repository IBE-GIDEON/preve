import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

// Next.js 16 renamed the Middleware convention to Proxy. Same runtime, same API.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json)$).*)",
  ],
};
