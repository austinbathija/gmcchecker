import { NextRequest, NextResponse } from "next/server";
import { scanStore } from "@/lib/scanner";

export const maxDuration = 60; // Allow up to 60 seconds for the deep scan

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid store URL is required." },
        { status: 400 }
      );
    }

    // Basic URL validation
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
