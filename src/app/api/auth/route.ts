import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSessionToken,
  buildSessionCookie,
  buildClearCookie,
  COOKIE_NAME,
  clearScanCount,
} from "@/lib/auth";

// POST /api/auth — Login
export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Incorrect password. Please try again." },
      { status: 401 }
    );
  }

  // Password correct — create session
  const token = createSessionToken();
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildSessionCookie(token));

  return response;
}

// DELETE /api/auth — Logout
export async function DELETE(request: NextRequest) {
  // Clean up scan count for this session
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (sessionCookie?.value) {
    clearScanCount(sessionCookie.value);
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildClearCookie());
  return response;
}
