import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { getAllScans } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(COOKIE_NAME);
  if (!sessionCookie?.value || !verifySessionToken(sessionCookie.value)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const scans = await getAllScans();
    return NextResponse.json(scans);
  } catch {
    return NextResponse.json(
      { error: "Failed to load scans." },
      { status: 500 }
    );
  }
}
