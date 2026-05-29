"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkLogin,
  mintSession,
  sessionCookieName,
  sessionTtlSeconds,
} from "@/lib/auth";

/**
 * Operator login. Validates the presented admin token server-side (constant
 * time) against `ADMIN_TOKEN`; on success it issues a signed, HttpOnly session
 * cookie. With no `ADMIN_TOKEN` configured, `checkLogin` returns false, so the
 * console stays locked (fails closed).
 */
export async function loginAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!checkLogin(token)) {
    redirect("/admin/login?error=1");
  }

  const jar = await cookies();
  jar.set(sessionCookieName, mintSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(sessionCookieName);
  redirect("/admin/login");
}
