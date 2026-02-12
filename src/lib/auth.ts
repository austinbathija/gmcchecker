import { scryptSync, randomBytes, createHmac, timingSafeEqual } from "crypto";

// --- Cookie config ---
export const COOKIE_NAME = "gmc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// --- Password verification ---
export function verifyPassword(inputPassword: string): boolean {
  const storedHash = process.env.ACCESS_PASSWORD_HASH;
  if (!storedHash) return false;

  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const inputHash = scryptSync(inputPassword, salt, 64).toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const inputBuffer = Buffer.from(inputHash, "hex");

  if (hashBuffer.length !== inputBuffer.length) return false;
  return timingSafeEqual(hashBuffer, inputBuffer);
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
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// --- IP-based attempt tracking ---
const failedAttempts = new Map<
  string,
  { count: number; lastAttempt: number }
>();
const MAX_ATTEMPTS = 3;

export function isLockedOut(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  return record.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip: string): number {
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();
  failedAttempts.set(ip, record);
  return MAX_ATTEMPTS - record.count; // remaining attempts
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export function getRemainingAttempts(ip: string): number {
  const record = failedAttempts.get(ip);
  if (!record) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - record.count);
}
