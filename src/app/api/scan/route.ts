import { NextRequest, NextResponse } from "next/server";
import { scanStore } from "@/lib/scanner";
import {
  verifySessionToken,
  COOKIE_NAME,
  recordScan,
  buildClearCookie,
} from "@/lib/auth";
import { logScan } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Verify session
  const sessionCookie = req.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value || !verifySessionToken(sessionCookie.value)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in.", loggedOut: true },
      { status: 401 }
    );
  }

  // Check scan limit
  const usage = recordScan(sessionCookie.value);
  if (!usage.allowed) {
    // Used all 3 scans — log them out
    const response = NextResponse.json(
      {
        error:
          "You have used all 3 scans for this session. Please log in again for 3 more.",
        loggedOut: true,
        scansUsed: usage.scansUsed,
      },
      { status: 403 }
    );
    response.headers.set("Set-Cookie", buildClearCookie());
    return response;
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid store URL is required." },
        { status: 400 }
      );
    }

    const cleaned = url.trim();
    if (cleaned.length < 4 || cleaned.length > 500) {
      return NextResponse.json(
        { error: "Please enter a valid store URL." },
        { status: 400 }
      );
    }

    const result = await scanStore(cleaned);

    // Log to database (fire-and-forget)
    logScan(result).catch(() => {});

    // Include scan usage info in the response
    return NextResponse.json({
      ...result,
      _usage: {
        scansUsed: usage.scansUsed,
        scansRemaining: usage.scansRemaining,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while scanning. Please try again." },
      { status: 500 }
    );
  }
}
