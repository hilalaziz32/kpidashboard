"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_TENANT_COOKIE } from "@/lib/active-tenant";

export async function switchTenant(tenantId: string) {
  const c = await cookies();
  c.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
}
