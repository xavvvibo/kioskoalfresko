import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function hashStaffPin(pin: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pin, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyStaffPin(candidate: string, pinHash?: string | null) {
  if (!candidate || !pinHash) return false;
  const [scheme, salt, expected] = pinHash.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(candidate, salt, 64).toString("base64url");
  return safeEqual(actual, expected);
}
