import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findAdminUserForLogin,
  getAdminUserById,
  updateAdminUserLastLogin,
  writeAdminAuditLog,
  type AdminUser,
} from "./repositories/admin-users.repository";

const ADMIN_COOKIE_NAME = "admin_kiosko_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;
const TOKEN_MESSAGE = "admin-kiosko-session-v1";
const USER_TOKEN_PREFIX = "user.";

export type AdminSession = {
  id: string | null;
  role: "owner" | "employee";
  username: string;
  displayName: string;
  legacy: boolean;
};

function getAdminPassword() {
  return process.env.ADMIN_KIOSKO_PASSWORD || "";
}

function createSessionToken(password: string) {
  return createHmac("sha256", password).update(TOKEN_MESSAGE).digest("hex");
}

function getSessionSecret() {
  return process.env.ADMIN_KIOSKO_SESSION_SECRET
    || process.env.ADMIN_KIOSKO_PASSWORD
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || "admin-kiosko-local-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function createUserSessionToken(user: Pick<AdminUser, "id" | "role">) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    role: user.role,
    createdAt: Date.now(),
  })).toString("base64url");
  return `${USER_TOKEN_PREFIX}${payload}.${sign(payload)}`;
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
  return Boolean(await getCurrentAdminSession());
}

export async function getCurrentAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  if (sessionToken.startsWith(USER_TOKEN_PREFIX)) {
    const token = sessionToken.slice(USER_TOKEN_PREFIX.length);
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string };
      if (!parsed.userId) return null;
      const result = await getAdminUserById(parsed.userId);
      if (!result.ok || !result.data || result.data.status !== "active") return null;

      return {
        id: result.data.id,
        role: result.data.role,
        username: result.data.username,
        displayName: result.data.display_name,
        legacy: false,
      };
    } catch {
      return null;
    }
  }

  const password = getAdminPassword();
  if (!password) return null;
  if (!safeEqual(sessionToken, createSessionToken(password))) return null;

  return {
    id: null,
    role: "owner",
    username: "legacy-owner",
    displayName: process.env.ADMIN_KIOSKO_LEGACY_DISPLAY_NAME || "F. Javier Bocanegra Sanjuan",
    legacy: true,
  };
}

export async function requireAdminSession(returnTo?: string) {
  const session = await getCurrentAdminSession();

  if (!session) {
    const target = returnTo ? `/admin-kiosko?next=${encodeURIComponent(returnTo)}` : "/admin-kiosko";
    redirect(target);
  }

  return session;
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
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function createAdminUserSession(user: AdminUser) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createUserSessionToken(user), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  await updateAdminUserLastLogin(user.id);
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyAdminPassword(candidate: string, passwordHash?: string | null) {
  if (!candidate || !passwordHash) return false;
  const [scheme, salt, expected] = passwordHash.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(candidate, salt, 64).toString("base64url");
  return safeEqual(actual, expected);
}

export async function loginAdminUser(identifier: string, password: string) {
  const userResult = await findAdminUserForLogin(identifier);
  if (!userResult.ok || !userResult.data) {
    await writeAdminAuditLog({
      action: "login_failed",
      entityType: "admin_user",
      entityId: identifier,
      metadata: { reason: "user_not_found" },
    });
    return { ok: false as const, error: "Credenciales incorrectas." };
  }

  const user = userResult.data;
  if (user.status !== "active") {
    await writeAdminAuditLog({
      actorUserId: user.id,
      action: "login_blocked_disabled",
      entityType: "admin_user",
      entityId: user.id,
      metadata: { username: user.username, role: user.role },
    });
    return { ok: false as const, error: "Usuario desactivado." };
  }

  if (!verifyAdminPassword(password, user.password_hash)) {
    await writeAdminAuditLog({
      actorUserId: user.id,
      action: "login_failed",
      entityType: "admin_user",
      entityId: user.id,
      metadata: { reason: "bad_password", username: user.username },
    });
    return { ok: false as const, error: "Credenciales incorrectas." };
  }

  await createAdminUserSession(user);
  await writeAdminAuditLog({
    actorUserId: user.id,
    action: "login",
    entityType: "admin_user",
    entityId: user.id,
    metadata: { username: user.username, role: user.role, displayName: user.display_name },
  });
  return { ok: true as const, data: user };
}
