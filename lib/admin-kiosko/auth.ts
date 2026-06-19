import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "admin_kiosko_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;
const TOKEN_MESSAGE = "admin-kiosko-session-v1";

function getAdminPassword() {
  return process.env.ADMIN_KIOSKO_PASSWORD || "";
}

function createSessionToken(password: string) {
  return createHmac("sha256", password).update(TOKEN_MESSAGE).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export async function isAdminAuthenticated() {
  const password = getAdminPassword();

  if (!password) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return false;
  }

  return safeEqual(sessionToken, createSessionToken(password));
}

export async function requireAdminSession() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin-kiosko");
  }
}

export async function createAdminSession() {
  const password = getAdminPassword();

  if (!password) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionToken(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin-kiosko",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin-kiosko",
    maxAge: 0,
  });
}

export function isCorrectAdminPassword(candidate: string) {
  const password = getAdminPassword();

  if (!password || !candidate) {
    return false;
  }

  return safeEqual(candidate, password);
}
