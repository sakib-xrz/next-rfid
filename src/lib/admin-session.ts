import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { RoleType, StatusType } from "@/lib/types";

export const ADMIN_SESSION_COOKIE = "rfid_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  userId: string;
  email: string;
  role: RoleType;
  status: StatusType;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "next-rfid-development-secret";
  }

  throw new Error("Missing AUTH_SECRET. Set a strong random value in your environment.");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSessionToken(
  payload: Omit<AdminSessionPayload, "exp">,
) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    }),
  ).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSessionPayload;
    if (!decoded.userId || !decoded.email || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function setAdminSessionCookie(
  response: NextResponse,
  user: Pick<AdminSessionPayload, "userId" | "email" | "role" | "status">,
) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(user), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
