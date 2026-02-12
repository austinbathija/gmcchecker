import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "gmc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000; // 7 days in ms

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/legal"];

const PUBLIC_EXTENSIONS = [
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value) {
    return redirectToLogin(request);
  }

  if (!verifySessionToken(sessionCookie.value)) {
    const response = redirectToLogin(request);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

function verifySessionToken(token: string): boolean {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || !token) return false;

  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return false;

  const payload = token.substring(0, lastDotIndex);
  const signature = token.substring(lastDotIndex + 1);

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  const payloadParts = payload.split(".");
  if (payloadParts.length < 2) return false;

  const timestamp = parseInt(payloadParts[payloadParts.length - 1], 36);
  const age = Date.now() - timestamp;

  return age < SESSION_MAX_AGE;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
