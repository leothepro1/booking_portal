import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  }

  return response
}

export const config = {
  matcher: "/api/:path*",
}
