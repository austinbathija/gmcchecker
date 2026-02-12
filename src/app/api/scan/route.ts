import { NextRequest, NextResponse } from "next/server";
import { scanStore } from "@/lib/scanner";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Defense-in-depth: verify session even though middleware should catch this
  const sessionCookie = req.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value || !verifySessionToken(sessionCookie.value)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
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
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "An error occurred while scanning. Please try again." },
      { status: 500 }
    );
  }
}
