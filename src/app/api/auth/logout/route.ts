import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/request";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const ip = getClientIp(req);

  if (session) {
    await createAuditLog({
      action: "LOGOUT",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
