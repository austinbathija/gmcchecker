import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSessionToken,
  buildSessionCookie,
  buildClearCookie,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/auth";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

// POST /api/auth — Login
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isLockedOut(ip)) {
    return NextResponse.json(
      {
        error: "Too many failed attempts. Access has been locked.",
        locked: true,
        remainingAttempts: 0,
      },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { password } = body;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    );
  }

  const isValid = verifyPassword(password);

  if (!isValid) {
    const remaining = recordFailedAttempt(ip);
    const locked = remaining <= 0;

    return NextResponse.json(
      {
        error: locked
          ? "Too many failed attempts. Access has been locked."
          : "Incorrect password.",
        locked,
        remainingAttempts: Math.max(0, remaining),
      },
      { status: locked ? 429 : 401 }
    );
  }

  // Password correct — create session
  clearFailedAttempts(ip);
  const token = createSessionToken();
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildSessionCookie(token));

  return response;
}

// DELETE /api/auth — Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildClearCookie());
  return response;
}
