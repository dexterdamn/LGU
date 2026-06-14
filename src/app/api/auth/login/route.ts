import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { verifyTotpToken } from "@/lib/totp";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpToken: z.string().length(6).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json();
    const { email, password, totpToken } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        userEmail: email,
        ipAddress: ip,
        reason: "Invalid email or password",
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Your account is pending admin approval" },
        { status: 403 }
      );
    }

    if (user.status === "DISABLED") {
      // Get admin email for contact
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { email: true },
      });
      return NextResponse.json(
        {
          error: "Your account has been disabled. Please contact the administrator for assistance.",
          adminEmail: admin?.email,
        },
        { status: 403 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account not active" }, { status: 403 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        userId: user.id,
        userEmail: user.email,
        userName: user.nickname,
        ipAddress: ip,
        reason: "Wrong password",
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.totpSecret) {
      if (!totpToken) {
        return NextResponse.json({ requiresTotp: true }, { status: 200 });
      }
      const validTotp = verifyTotpToken(totpToken, user.totpSecret);
      if (!validTotp) {
        await createAuditLog({
          action: "LOGIN_FAILED",
          userId: user.id,
          userEmail: user.email,
          userName: user.nickname,
          ipAddress: ip,
          reason: "Invalid authenticator code",
        });
        return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
      }
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.nickname || user.name,
    });

    await setSessionCookie(token);

    await createAuditLog({
      action: "LOGIN",
      userId: user.id,
      userEmail: user.email,
      userName: user.nickname,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
