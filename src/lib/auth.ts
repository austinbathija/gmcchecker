import { randomBytes, createHmac, timingSafeEqual } from "crypto";

// --- Cookie config ---
export const COOKIE_NAME = "gmc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
const MAX_SCANS = 3;

// --- Password verification ---
export function verifyPassword(inputPassword: string): boolean {
  const storedPassword = process.env.ACCESS_PASSWORD;
  if (!storedPassword) return false;
  return inputPassword === storedPassword;
}

// --- Session tokens (HMAC-signed) ---
function signData(data: string): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET not set");
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function createSessionToken(): string {
  const payload =
    randomBytes(32).toString("hex") + "." + Date.now().toString(36);
  const signature = signData(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  if (!token) return false;

  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return false;

  const payload = token.substring(0, lastDotIndex);
  const signature = token.substring(lastDotIndex + 1);

  const expectedSignature = signData(payload);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  // Check token age
  const payloadParts = payload.split(".");
  if (payloadParts.length < 2) return false;

  const timestamp = parseInt(payloadParts[payloadParts.length - 1], 36);
  const age = Date.now() - timestamp;

  return age < SESSION_MAX_AGE * 1000;
}

// --- Cookie helpers ---
const isProduction = process.env.NODE_ENV === "production";

export function buildSessionCookie(token: string): string {
  const secure = isProduction ? " Secure;" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function buildClearCookie(): string {
  const secure = isProduction ? " Secure;" : "";
  return `${COOKIE_NAME}=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`;
}

// --- Scan usage tracking (per session) ---
const scanCounts = new Map<string, number>();

export function recordScan(token: string): {
  allowed: boolean;
  scansUsed: number;
  scansRemaining: number;
} {
  const current = scanCounts.get(token) || 0;

  if (current >= MAX_SCANS) {
    return { allowed: false, scansUsed: current, scansRemaining: 0 };
  }

  const newCount = current + 1;
  scanCounts.set(token, newCount);

  return {
    allowed: true,
    scansUsed: newCount,
    scansRemaining: MAX_SCANS - newCount,
  };
}

export function getScansRemaining(token: string): number {
  const current = scanCounts.get(token) || 0;
  return Math.max(0, MAX_SCANS - current);
}

export function clearScanCount(token: string): void {
  scanCounts.delete(token);
}
